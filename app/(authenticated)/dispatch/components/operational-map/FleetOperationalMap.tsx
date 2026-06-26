"use client";

import "./operational-map.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetRecommendationInstance,
} from "@/src/types/fleet";
import {
  BranchZonesLayer,
  boundsFromPoints,
  ClusteredHtmlMarkers,
  FleetMap,
  FLEET_MAP_FIT_PADDING,
  FLEET_MAP_MAX_FIT_ZOOM,
  jobMarkerHtml,
  RoutesLayer,
  truckMarkerHtml,
  type FleetMapHandle,
  type FleetMapRouteFeature,
} from "@/src/components/fleet-map";
import { hasCoordinate } from "../../dispatch-map-utils";
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
};

type TruckMarkerProps = {
  state: TruckVisualState;
  unitNumber: string;
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
}: FleetOperationalMapProps) {
  const [layers, setLayers] = useState<OperationalMapLayers>(DEFAULT_OPERATIONAL_LAYERS);
  const [legendOpen, setLegendOpen] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const mapRef = useRef<FleetMapHandle | null>(null);

  const recJobId = activeRecommendation?.rationale.entities.job_id;
  const recTopTruckId = activeRecommendation?.rationale.candidates?.[0]?.truck_id;
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
      opts?: { dashed?: boolean; primary?: boolean }
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
        coordinates: [
          [truck.longitude as number, truck.latitude as number],
          [job.site_longitude as number, job.site_latitude as number],
        ],
      });
    };

    if (layers.recommendations && activeRecommendation) {
      addRoute(recTopTruckId, recJobId, "rec-primary", { primary: true });
      for (const altId of recAltTruckIds) {
        addRoute(altId, recJobId, `rec-alt-${altId}`, { dashed: true });
      }
    } else if (selectedJobId && highlightedTruckId) {
      addRoute(highlightedTruckId, selectedJobId, "selection", { primary: true });
    }

    if (layers.deadhead && activeRecommendation && recTopTruckId && recJobId) {
      addRoute(recTopTruckId, recJobId, "deadhead", { dashed: true, primary: true });
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
    truckLanes,
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

  const truckClusterPoints = useMemo(
    () =>
      visibleTrucks.map((lane) => {
        const state = truckVisualState(lane, highlightedTruckId, recTopTruckId, highRevenueThreshold);
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
          } satisfies TruckMarkerProps & { dimmed: number },
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
    ]
  );

  const jobClusterPoints = useMemo(
    () =>
      visibleJobs.map((job) => ({
        id: job.id,
        longitude: job.site_longitude as number,
        latitude: job.site_latitude as number,
        properties: {
          state: jobVisualState(job, selectedJobId, recJobId),
          priority: job.priority,
        } satisfies JobMarkerProps,
      })),
    [recJobId, selectedJobId, visibleJobs]
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

    const latitude = truck?.latitude ?? job?.site_latitude;
    const longitude = truck?.longitude ?? job?.site_longitude;
    if (!hasCoordinate(latitude, longitude)) return;

    const map = mapRef.current?.getMap();
    mapRef.current?.flyTo({
      center: [longitude as number, latitude as number],
      zoom: Math.min(FLEET_MAP_MAX_FIT_ZOOM, Math.max((map?.getZoom() ?? 10) + 0.5, 12)),
      duration: 720,
      essential: true,
    });
  }, [highlightedTruckId, jobs, recJobId, selectedJobId, selectionKey, truckLanes]);

  const recConfidence = activeRecommendation ? recommendationConfidence(activeRecommendation) : null;

  const renderTruckHtml = useCallback((props: TruckMarkerProps) => {
    return truckMarkerHtml(props.state, props.unitNumber);
  }, []);

  const renderJobHtml = useCallback((props: JobMarkerProps) => {
    return jobMarkerHtml(props.state, props.priority);
  }, []);

  return (
    <div className={`opmap-shell relative h-full w-full ${consoleMode ? "opmap-shell--console" : ""}`}>
      <FleetMap ref={mapRef} className="opmap-mapbox h-full w-full" initialCenter={center} initialZoom={bounds ? 10 : 8}>
        <BranchZonesLayer
          zones={branchZoneFeatures}
          showCapacity={layers.capacity}
          visible={layers.branches || layers.capacity}
        />
        <RoutesLayer routes={routeLines} visible={layers.routes} />

        {layers.trucks || layers.gpsHealth ? (
          <ClusteredHtmlMarkers<TruckMarkerProps & { dimmed: number }>
            points={truckClusterPoints}
            kind="truck"
            renderPointHtml={renderTruckHtml}
            onPointClick={(id) => onSelectTruck(highlightedTruckId === id ? null : id)}
            onClusterClick={handleClusterZoom}
            getOpacity={(props) => (props.dimmed ? 0.45 : 1)}
          />
        ) : null}

        {(layers.jobs || layers.revenueAtRisk) && jobClusterPoints.length > 0 ? (
          <ClusteredHtmlMarkers<JobMarkerProps>
            points={jobClusterPoints}
            kind="job"
            clusterRadius={48}
            renderPointHtml={renderJobHtml}
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
      />

      {layers.recommendations && activeRecommendation && topSnapshot ? (
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

      {(layers.branches || layers.capacity) && branchZones.length > 0 ? (
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

      {selectedTruckLane ? (
        <TruckIntelPanel
          lane={selectedTruckLane}
          recommendations={recommendations}
          onClose={() => onSelectTruck(null)}
          onSelectJob={onSelectJob}
        />
      ) : null}

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
