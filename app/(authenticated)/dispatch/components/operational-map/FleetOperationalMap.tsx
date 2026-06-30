"use client";

import "@/src/components/fleet/icons/fleet-icons.css";

import "./operational-map.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetRecommendationInstance,
} from "@/src/types/fleet";
import {
  truckBadgeFromLane,
  mapTruckVisualStatus,
  mapJobVisualStatus,
  type FleetBadgeType,
} from "@/src/components/fleet/icons";
import {
  BranchZonesLayer,
  boundsFromPoints,
  ClusteredMarkers,
  FleetMap,
  FLEET_MAP_FIT_PADDING,
  FLEET_MAP_MAX_FIT_ZOOM,
  FLEET_MAP_STYLE_DARK,
  FLEET_MAP_STYLE_SATELLITE,
  JobMarker,
  RoutesLayer,
  TrafficLayer,
  TruckMarker,
  useAnimatedPositions,
  type FleetMapHandle,
  type FleetMapRouteFeature,
} from "@/src/components/fleet-map";
import { hasCoordinate } from "../../dispatch-map-utils";
import { buildJobSpatialIndex } from "@/src/lib/fleet/dispatch/spatial-index";
import { formatCurrency, operationalRiskMessage, recommendationConfidence } from "../fleet-dispatch-utils";
import { confidenceLabel } from "../../../operations/components/fleet-recommendation-utils";
import { computeBranchZones } from "./branch-zones";
import { jobVisualState, truckVisualState } from "./marker-status";
import { OperationalMapControls } from "./OperationalMapControls";
import { TruckIntelPanel } from "./TruckIntelPanel";
import { DEFAULT_OPERATIONAL_LAYERS, type JobVisualState, type OperationalMapLayers, type TruckVisualState } from "./types";

type FleetOperationalMapProps = {
  jobs: FleetDispatchJob[];
  truckLanes: FleetDispatchTruckLane[];
  branchCapacity: FleetDispatchBoardData["branchCapacity"];
  recommendations: FleetRecommendationInstance[];
  selectedJobId: string | null;
  highlightedTruckId: string | null;
  activeRecommendation: FleetRecommendationInstance | null;
  onSelectJob: (id: string | null) => void;
  onSelectTruck: (id: string | null) => void;
  consoleMode?: boolean;
  dragTruckId?: string | null;
  dragCursorLngLat?: [number, number] | null;
  dragEligibleJobIds?: Set<string>;
  dragInvalidJobIds?: Set<string>;
  hoverDropJobId?: string | null;
  onTruckDragStart?: (truckId: string) => void;
  onTruckDropOnJob?: (truckId: string, jobId: string) => void;
  onTruckDragCancel?: () => void;
  jobIntelPanel?: React.ReactNode;
  truckJobAlternatives?: Array<{ jobId: string; jobTitle: string; score: number; explanation: string[] }>;
  assignmentPanel?: React.ReactNode;
  assignmentToasts?: React.ReactNode;
  mapAssignSuccessToken?: number;
};

type TruckMarkerProps = {
  state: TruckVisualState;
  unitNumber: string;
  dimmed?: number;
  badge?: FleetBadgeType;
};

type JobMarkerProps = {
  state: JobVisualState;
  priority: string;
};

function useFleetViewport(jobs: FleetDispatchJob[], truckLanes: FleetDispatchTruckLane[]) {
  return useMemo(() => {
    const points: Array<{ latitude: number; longitude: number }> = [];
    for (const lane of truckLanes) {
      if (hasCoordinate(lane.latitude, lane.longitude)) {
        points.push({ latitude: lane.latitude as number, longitude: lane.longitude as number });
      }
    }
    for (const job of jobs) {
      if (hasCoordinate(job.site_latitude, job.site_longitude)) {
        points.push({ latitude: job.site_latitude as number, longitude: job.site_longitude as number });
      }
    }
    const bounds = boundsFromPoints(points);
    if (!bounds) {
      return { center: [-84.55, 33.95] as [number, number], bounds: null };
    }
    const center: [number, number] = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
    return { center, bounds };
  }, [jobs, truckLanes]);
}

export function FleetOperationalMap({
  jobs,
  truckLanes,
  branchCapacity,
  recommendations,
  selectedJobId,
  highlightedTruckId,
  activeRecommendation,
  onSelectJob,
  onSelectTruck,
  consoleMode = false,
  dragTruckId = null,
  dragCursorLngLat = null,
  dragEligibleJobIds,
  dragInvalidJobIds,
  hoverDropJobId = null,
  onTruckDragStart,
  onTruckDropOnJob,
  onTruckDragCancel,
  jobIntelPanel,
  truckJobAlternatives,
  assignmentPanel,
  assignmentToasts,
  mapAssignSuccessToken = 0,
}: FleetOperationalMapProps) {
  const [layers, setLayers] = useState<OperationalMapLayers>(DEFAULT_OPERATIONAL_LAYERS);
  const [legendOpen, setLegendOpen] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [basemap, setBasemap] = useState<"dark" | "satellite">("dark");
  const [trafficOn, setTrafficOn] = useState(false);
  const mapRef = useRef<FleetMapHandle | null>(null);
  const [internalDragTruckId, setInternalDragTruckId] = useState<string | null>(null);
  const [internalDragCursor, setInternalDragCursor] = useState<[number, number] | null>(null);
  const [internalHoverJobId, setInternalHoverJobId] = useState<string | null>(null);

  const activeDragTruckId = dragTruckId ?? internalDragTruckId;
  const activeDragCursor = dragCursorLngLat ?? internalDragCursor;
  const activeHoverJobId = hoverDropJobId ?? internalHoverJobId;

  const unassignedJobIds = useMemo(
    () => new Set(jobs.filter((j) => j.status === "unassigned" || !j.assigned_truck_id).map((j) => j.id)),
    [jobs]
  );
  const assignedJobIds = useMemo(
    () => new Set(jobs.filter((j) => j.assigned_truck_id && j.status !== "unassigned").map((j) => j.id)),
    [jobs]
  );
  const activeEligibleJobs = dragEligibleJobIds ?? unassignedJobIds;
  const activeInvalidJobs = dragInvalidJobIds ?? assignedJobIds;

  const jobSpatialIndex = useMemo(() => buildJobSpatialIndex(jobs), [jobs]);

  const findNearestJobId = useCallback(
    (lng: number, lat: number): string | null => {
      return jobSpatialIndex.findNearest(lng, lat);
    },
    [jobSpatialIndex]
  );

  const handleInternalDragStart = useCallback(
    (truckId: string) => {
      if (!onTruckDropOnJob) {
        onTruckDragStart?.(truckId);
        return;
      }
      setInternalDragTruckId(truckId);
      onTruckDragStart?.(truckId);
    },
    [onTruckDragStart, onTruckDropOnJob]
  );

  useEffect(() => {
    if (!internalDragTruckId || !onTruckDropOnJob) return;

    let rafId: number | null = null;
    let pendingEvent: PointerEvent | null = null;

    const applyPointerMove = () => {
      rafId = null;
      const event = pendingEvent;
      pendingEvent = null;
      if (!event) return;
      const map = mapRef.current?.getMap();
      if (!map) return;
      const rect = map.getContainer().getBoundingClientRect();
      const lngLat = map.unproject([event.clientX - rect.left, event.clientY - rect.top]);
      setInternalDragCursor([lngLat.lng, lngLat.lat]);
      const nearest = findNearestJobId(lngLat.lng, lngLat.lat);
      setInternalHoverJobId((prev) => (prev === nearest ? prev : nearest));
    };

    const handleMove = (event: PointerEvent) => {
      pendingEvent = event;
      if (rafId == null) {
        rafId = window.requestAnimationFrame(applyPointerMove);
      }
    };

    const handleUp = (event: PointerEvent) => {
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      const map = mapRef.current?.getMap();
      if (map) {
        const rect = map.getContainer().getBoundingClientRect();
        const lngLat = map.unproject([event.clientX - rect.left, event.clientY - rect.top]);
        const jobId = findNearestJobId(lngLat.lng, lngLat.lat);
        if (jobId) {
          onTruckDropOnJob(internalDragTruckId, jobId);
        } else {
          onTruckDragCancel?.();
        }
      }
      setInternalDragTruckId(null);
      setInternalDragCursor(null);
      setInternalHoverJobId(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [findNearestJobId, internalDragTruckId, onTruckDragCancel, onTruckDropOnJob]);

  const recJobId = activeRecommendation?.rationale.entities.job_id;
  const recTopTruckId = activeRecommendation?.rationale.candidates?.[0]?.truck_id;
  const dragContext = activeDragTruckId
    ? {
        dragTruckId: activeDragTruckId,
        eligibleJobIds: activeEligibleJobs,
        invalidJobIds: activeInvalidJobs,
        hoverDropJobId: activeHoverJobId,
      }
    : undefined;
  const recAltTruckIds = useMemo(
    () =>
      activeRecommendation?.rationale.candidates?.slice(1, 3).map((candidate) => candidate.truck_id) ?? [],
    [activeRecommendation]
  );
  const topSnapshot = activeRecommendation?.rationale.candidate_snapshots?.[0];

  const { center, bounds } = useFleetViewport(jobs, truckLanes);
  const branchZones = useMemo(
    () => (layers.branches || layers.capacity ? computeBranchZones(truckLanes, branchCapacity) : []),
    [branchCapacity, layers.branches, layers.capacity, truckLanes]
  );

  const selectedTruckLane = useMemo(
    () => (highlightedTruckId ? truckLanes.find((l) => l.truck_id === highlightedTruckId) : null),
    [highlightedTruckId, truckLanes]
  );

  const routeLines = useMemo((): FleetMapRouteFeature[] => {
    if (!layers.routes) return [];

    const lines: FleetMapRouteFeature[] = [];

    const addRoute = (
      truckId: string | undefined,
      jobId: string | undefined,
      id: string,
      opts?: {
        dashed?: boolean;
        primary?: boolean;
        recommendation?: boolean;
        animated?: boolean;
        label?: string;
      }
    ) => {
      const truck = truckId ? truckLanes.find((l) => l.truck_id === truckId) : undefined;
      const job = jobs.find((j) => j.id === jobId);
      if (
        !truck ||
        !job ||
        !hasCoordinate(truck.latitude, truck.longitude) ||
        !hasCoordinate(job.site_latitude, job.site_longitude)
      ) {
        return;
      }
      lines.push({
        id,
        primary: opts?.primary,
        dashed: opts?.dashed,
        recommendation: opts?.recommendation,
        animated: opts?.animated,
        label: opts?.label,
        coordinates: [
          [truck.longitude as number, truck.latitude as number],
          [job.site_longitude as number, job.site_latitude as number],
        ],
      });
    };

    if (layers.recommendations && activeRecommendation) {
      const deadheadLabel =
        topSnapshot?.deadhead_miles != null
          ? `${topSnapshot.deadhead_miles.toFixed(1)} mi deadhead`
          : undefined;
      addRoute(recTopTruckId, recJobId, "rec-primary", {
        primary: true,
        recommendation: true,
        animated: true,
        label: deadheadLabel,
      });
      for (const altId of recAltTruckIds) {
        addRoute(altId, recJobId, `rec-alt-${altId}`, { dashed: true });
      }
    } else if (selectedJobId && highlightedTruckId) {
      addRoute(highlightedTruckId, selectedJobId, "selection", { primary: true });
    }

    if (activeDragTruckId && activeDragCursor) {
      const truck = truckLanes.find((l) => l.truck_id === activeDragTruckId);
      if (truck && hasCoordinate(truck.latitude, truck.longitude)) {
        lines.push({
          id: "drag-preview",
          dashed: true,
          animated: true,
          primary: true,
          coordinates: [
            [truck.longitude as number, truck.latitude as number],
            activeDragCursor,
          ],
        });
      }
    }

    if (layers.deadhead && activeRecommendation && recTopTruckId && recJobId && !layers.recommendations) {
      const deadheadLabel =
        topSnapshot?.deadhead_miles != null
          ? `${topSnapshot.deadhead_miles.toFixed(1)} mi`
          : undefined;
      addRoute(recTopTruckId, recJobId, "deadhead", {
        dashed: true,
        primary: true,
        label: deadheadLabel,
      });
    }

    return lines;
  }, [
    activeRecommendation,
    highlightedTruckId,
    jobs,
    layers.deadhead,
    layers.recommendations,
    layers.routes,
    recAltTruckIds,
    recJobId,
    recTopTruckId,
    selectedJobId,
    topSnapshot,
    truckLanes,
    activeDragTruckId,
    activeDragCursor,
  ]);

  const visibleTrucks = useMemo(() => {
    if (!layers.trucks) return [];
    return truckLanes.filter((lane) => {
      if (!hasCoordinate(lane.latitude, lane.longitude)) return false;
      if (layers.gpsHealth && lane.telematics_status === "offline") return true;
      if (layers.gpsHealth && lane.telematics_status !== "offline") return false;
      return true;
    });
  }, [layers.gpsHealth, layers.trucks, truckLanes]);

  const highRevenueThreshold = useMemo(() => {
    const revenues = truckLanes.map((lane) => lane.revenue_today ?? 0).filter((r) => r > 0);
    if (revenues.length < 3) return Infinity;
    const sorted = [...revenues].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.75)] ?? Infinity;
  }, [truckLanes]);

  const visibleJobs = useMemo(() => {
    if (!layers.jobs && !layers.revenueAtRisk) return [];
    return jobs.filter((job) => {
      if (!hasCoordinate(job.site_latitude, job.site_longitude)) return false;
      if (layers.revenueAtRisk && !layers.jobs) {
        return Boolean(operationalRiskMessage(job));
      }
      return layers.jobs;
    });
  }, [jobs, layers.jobs, layers.revenueAtRisk]);

  const truckAnimSource = useMemo(
    () =>
      visibleTrucks.map((lane) => ({
        id: lane.truck_id,
        latitude: lane.latitude as number,
        longitude: lane.longitude as number,
      })),
    [visibleTrucks]
  );

  const animatedTruckPositions = useAnimatedPositions(truckAnimSource, {
    enabled: !activeDragTruckId,
  });

  const truckClusterPoints = useMemo(
    () =>
      visibleTrucks.map((lane) => {
        const state = truckVisualState(
          lane,
          highlightedTruckId,
          recTopTruckId,
          highRevenueThreshold,
          activeDragTruckId
        );
        const dimmed =
          layers.recommendations &&
          activeRecommendation &&
          recTopTruckId &&
          lane.truck_id !== recTopTruckId &&
          !recAltTruckIds.includes(lane.truck_id);
        return {
          id: lane.truck_id,
          longitude: lane.longitude as number,
          latitude: lane.latitude as number,
          properties: {
            state,
            unitNumber: lane.unit_number,
            dimmed: dimmed ? 1 : 0,
            badge: truckBadgeFromLane(lane),
          } satisfies TruckMarkerProps,
        };
      }),
    [
      activeRecommendation,
      highlightedTruckId,
      layers.recommendations,
      recAltTruckIds,
      recTopTruckId,
      visibleTrucks,
      highRevenueThreshold,
      dragTruckId,
    ]
  );

  const jobClusterPoints = useMemo(
    () =>
      visibleJobs.map((job) => ({
        id: job.id,
        longitude: job.site_longitude as number,
        latitude: job.site_latitude as number,
        properties: {
          state: jobVisualState(job, selectedJobId, recJobId, dragContext),
          priority: job.priority,
        } satisfies JobMarkerProps,
      })),
    [dragContext, recJobId, selectedJobId, visibleJobs]
  );

  const branchZoneFeatures = useMemo(
    () =>
      branchZones.map((zone) => ({
        id: zone.branch_id,
        name: zone.branch_name,
        latitude: zone.latitude,
        longitude: zone.longitude,
        radiusMeters: zone.radiusMeters,
        utilization: zone.utilization,
        truckCount: zone.truckCount,
      })),
    [branchZones]
  );

  const activeJob = recJobId ? jobs.find((j) => j.id === recJobId) : jobs.find((j) => j.id === selectedJobId);
  const activeRisk = activeJob ? operationalRiskMessage(activeJob) : null;
  const hasMapPoints =
    jobs.some((job) => hasCoordinate(job.site_latitude, job.site_longitude)) ||
    truckLanes.some((lane) => hasCoordinate(lane.latitude, lane.longitude));

  const toggleLayer = useCallback((key: keyof OperationalMapLayers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const layerCounts = useMemo(
    (): Partial<Record<keyof OperationalMapLayers, number>> => ({
      trucks: visibleTrucks.length,
      jobs: visibleJobs.length,
      recommendations: recommendations.length,
      routes: routeLines.length,
      branches: branchZones.length,
      capacity: branchZones.length,
      deadhead:
        layers.deadhead && activeRecommendation && topSnapshot?.deadhead_miles != null ? 1 : 0,
    }),
    [
      activeRecommendation,
      branchZones.length,
      layers.deadhead,
      recommendations.length,
      routeLines.length,
      topSnapshot?.deadhead_miles,
      visibleJobs.length,
      visibleTrucks.length,
    ]
  );

  const fitFleetBounds = useCallback(() => {
    if (!bounds) return;
    mapRef.current?.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding: FLEET_MAP_FIT_PADDING, maxZoom: FLEET_MAP_MAX_FIT_ZOOM, duration: 600 }
    );
  }, [bounds]);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const handleCenterFleet = useCallback(() => fitFleetBounds(), [fitFleetBounds]);
  const handleResetView = useCallback(() => setResetToken((t) => t + 1), []);

  const handleClusterZoom = useCallback((longitude: number, latitude: number) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      zoom: Math.min(map.getZoom() + 2, FLEET_MAP_MAX_FIT_ZOOM),
      duration: 500,
    });
  }, []);

  useEffect(() => {
    if (!bounds) return;
    fitFleetBounds();
  }, [bounds, consoleMode, fitFleetBounds, resetToken]);

  const selectionKey = `${highlightedTruckId ?? ""}:${selectedJobId ?? ""}:${recJobId ?? ""}`;
  const prevSelectionKey = useRef<string | null>(null);

  useEffect(() => {
    if (!selectionKey || selectionKey === ":") return;
    if (prevSelectionKey.current === selectionKey) return;
    prevSelectionKey.current = selectionKey;

    const truck = highlightedTruckId
      ? truckLanes.find((lane) => lane.truck_id === highlightedTruckId)
      : null;
    const jobId = selectedJobId ?? recJobId;
    const job = jobId ? jobs.find((item) => item.id === jobId) : null;

    const truckCoord =
      truck && hasCoordinate(truck.latitude, truck.longitude)
        ? ([truck.longitude as number, truck.latitude as number] as [number, number])
        : null;
    const jobCoord =
      job && hasCoordinate(job.site_latitude, job.site_longitude)
        ? ([job.site_longitude as number, job.site_latitude as number] as [number, number])
        : null;

    if (truckCoord && jobCoord) {
      const minLng = Math.min(truckCoord[0], jobCoord[0]);
      const maxLng = Math.max(truckCoord[0], jobCoord[0]);
      const minLat = Math.min(truckCoord[1], jobCoord[1]);
      const maxLat = Math.max(truckCoord[1], jobCoord[1]);
      const lngPad = Math.max(0.018, (maxLng - minLng) * 0.4);
      const latPad = Math.max(0.014, (maxLat - minLat) * 0.4);
      mapRef.current?.fitBounds(
        [
          [minLng - lngPad, minLat - latPad],
          [maxLng + lngPad, maxLat + latPad],
        ],
        {
          padding: { top: 72, bottom: 100, left: 56, right: consoleMode ? 240 : 56 },
          duration: 880,
          maxZoom: 14,
        }
      );
      return;
    }

    const coord = truckCoord ?? jobCoord;
    if (!coord) return;

    const map = mapRef.current?.getMap();
    const currentZoom = map?.getZoom() ?? 10;
    mapRef.current?.flyTo({
      center: coord,
      zoom: Math.min(FLEET_MAP_MAX_FIT_ZOOM, Math.max(currentZoom, 12.5)),
      duration: 780,
      essential: true,
    });
  }, [
    consoleMode,
    highlightedTruckId,
    jobs,
    recJobId,
    selectedJobId,
    selectionKey,
    truckLanes,
  ]);

  const recConfidence = activeRecommendation ? recommendationConfidence(activeRecommendation) : null;

  const renderTruck = useCallback(
    (props: TruckMarkerProps, meta?: { bearing: number | null }) => (
      <TruckMarker
        state={mapTruckVisualStatus(props.state)}
        unitNumber={props.unitNumber}
        headingDeg={meta?.bearing ?? null}
        dimmed={props.dimmed === 1}
        badge={props.badge}
      />
    ),
    []
  );

  const renderJob = useCallback(
    (props: JobMarkerProps) => (
      <JobMarker state={mapJobVisualStatus(props.state)} priority={props.priority} />
    ),
    []
  );

  return (
    <div
      className={`opmap-shell relative h-full w-full ${consoleMode ? "opmap-shell--console" : ""}${mapAssignSuccessToken ? " opmap-shell--assign-success" : ""}`}
      data-assign-flash={mapAssignSuccessToken || undefined}
    >
      <FleetMap
        ref={mapRef}
        className="opmap-mapbox h-full w-full"
        initialCenter={center}
        initialZoom={bounds ? 10 : 8}
        mapStyle={basemap === "satellite" ? FLEET_MAP_STYLE_SATELLITE : FLEET_MAP_STYLE_DARK}
      >
        <TrafficLayer visible={trafficOn} />
        <BranchZonesLayer
          zones={branchZoneFeatures}
          showCapacity={layers.capacity}
          visible={layers.branches || layers.capacity}
        />
        <RoutesLayer routes={routeLines} visible={layers.routes} />

        {layers.trucks || layers.gpsHealth ? (
          <ClusteredMarkers<TruckMarkerProps>
            points={truckClusterPoints}
            kind="truck"
            renderPoint={renderTruck}
            onPointClick={(id) => onSelectTruck(highlightedTruckId === id ? null : id)}
            onClusterClick={handleClusterZoom}
            getOpacity={(props) => (props.dimmed === 1 ? 0.45 : 1)}
            animatedPositions={animatedTruckPositions}
            draggable={Boolean(onTruckDropOnJob || onTruckDragStart)}
            onPointDragStart={handleInternalDragStart}
          />
        ) : null}

        {(layers.jobs || layers.revenueAtRisk) && jobClusterPoints.length > 0 ? (
          <ClusteredMarkers<JobMarkerProps>
            points={jobClusterPoints}
            kind="job"
            clusterRadius={48}
            renderPoint={renderJob}
            onPointClick={(id) => onSelectJob(selectedJobId === id ? null : id)}
            onClusterClick={handleClusterZoom}
          />
        ) : null}
      </FleetMap>

      {consoleMode ? (
        <div className="opmap-vignette opmap-vignette--canvas pointer-events-none" aria-hidden />
      ) : (
        <div className="opmap-vignette pointer-events-none" aria-hidden />
      )}

      {consoleMode ? (
        <div className="opmap-map-chrome">
          <button
            type="button"
            className={`opmap-map-chrome__chip ${basemap === "dark" ? "opmap-map-chrome__chip--active" : "opmap-map-chrome__chip--muted"}`}
            aria-pressed={basemap === "dark"}
            onClick={() => setBasemap("dark")}
          >
            Map
          </button>
          <button
            type="button"
            className={`opmap-map-chrome__chip ${basemap === "satellite" ? "opmap-map-chrome__chip--active" : "opmap-map-chrome__chip--muted"}`}
            aria-pressed={basemap === "satellite"}
            onClick={() => setBasemap("satellite")}
          >
            Satellite
          </button>
          <button
            type="button"
            className={`opmap-map-chrome__chip ${trafficOn ? "opmap-map-chrome__chip--active" : "opmap-map-chrome__chip--muted"}`}
            aria-pressed={trafficOn}
            onClick={() => setTrafficOn((on) => !on)}
          >
            Traffic
          </button>
          <button type="button" className="opmap-map-chrome__fit" onClick={handleCenterFleet}>
            Fit view
          </button>
        </div>
      ) : null}

      <div className="opmap-hud opmap-hud--top-left">
        <span className="dispatch-mission__live-badge">
          <span className="dispatch-mission__live-dot" aria-hidden />
          Live operational feed
        </span>
        <span className="opmap-hud__meta">
          {truckLanes.length} units · {jobs.length} jobs
          {branchZones.length > 0 ? ` · ${branchZones.length} zones` : ""}
        </span>
        {selectedJobId ? (
          <button type="button" className="opmap-hud__action" onClick={() => onSelectJob(null)}>
            Clear job
          </button>
        ) : null}
      </div>

      <OperationalMapControls
        layers={layers}
        onToggleLayer={toggleLayer}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenterFleet={handleCenterFleet}
        onResetView={handleResetView}
        legendOpen={legendOpen}
        onToggleLegend={() => setLegendOpen((v) => !v)}
        layerCounts={layerCounts}
      />

      {layers.recommendations && activeRecommendation && topSnapshot && !consoleMode ? (
        <div className="opmap-rec-intel">
          <p className="opmap-rec-intel__eyebrow">Recommendation intelligence</p>
          <p className="opmap-rec-intel__title">{activeRecommendation.rationale.title}</p>
          <div className="opmap-rec-intel__grid">
            {topSnapshot.revenue_impact > 0 ? (
              <div>
                <span className="opmap-rec-intel__label">Revenue impact</span>
                <span className="opmap-rec-intel__value">{formatCurrency(topSnapshot.revenue_impact)}</span>
              </div>
            ) : null}
            {topSnapshot.deadhead_miles != null ? (
              <div>
                <span className="opmap-rec-intel__label">Deadhead</span>
                <span className="opmap-rec-intel__value">{topSnapshot.deadhead_miles.toFixed(1)} mi</span>
              </div>
            ) : null}
            {topSnapshot.travel_minutes != null ? (
              <div>
                <span className="opmap-rec-intel__label">Travel</span>
                <span className="opmap-rec-intel__value">{Math.round(topSnapshot.travel_minutes)} min</span>
              </div>
            ) : null}
            {recConfidence ? (
              <div>
                <span className="opmap-rec-intel__label">Confidence</span>
                <span className="opmap-rec-intel__value">{confidenceLabel(recConfidence)}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeRisk ? <div className="opmap-risk-banner">{activeRisk}</div> : null}

      {(layers.branches || layers.capacity) && branchZones.length > 0 && !consoleMode ? (
        <div className="opmap-branch-legend">
          {branchZones.slice(0, 4).map((zone) => (
            <div key={zone.branch_id} className="opmap-branch-legend__row">
              <span className="opmap-branch-legend__name">{zone.branch_name}</span>
              <span className="opmap-branch-legend__stat">
                {zone.truckCount} trucks · {Math.round(zone.utilization * 100)}% util
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {jobIntelPanel}

      {selectedTruckLane && !jobIntelPanel ? (
        <TruckIntelPanel
          lane={selectedTruckLane}
          recommendations={recommendations}
          jobAlternatives={truckJobAlternatives}
          onClose={() => onSelectTruck(null)}
          onSelectJob={onSelectJob}
        />
      ) : null}

      {assignmentPanel}
      {assignmentToasts}

      {!hasMapPoints ? (
        <div className="opmap-empty-state">
          <div className="opmap-empty-state__card">
            <p className="font-semibold">Awaiting telemetry</p>
            <p className="mt-1 text-[var(--text-muted)]">
              Operational markers appear when GPS coordinates are available.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
