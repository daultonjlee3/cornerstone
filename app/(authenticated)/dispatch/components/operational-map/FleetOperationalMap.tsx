"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "./operational-map.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L, { latLngBounds } from "leaflet";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetRecommendationInstance,
} from "@/src/types/fleet";
import { hasCoordinate } from "../../dispatch-map-utils";
import { formatCurrency, operationalRiskMessage, recommendationConfidence } from "../fleet-dispatch-utils";
import { confidenceLabel } from "../../../operations/components/fleet-recommendation-utils";
import { computeBranchZones } from "./branch-zones";
import { MarkerClusterGroup } from "./MarkerClusterGroup";
import { createClusterMarkerIcon, createJobMarkerIcon, createTruckMarkerIcon } from "./marker-icons";
import { jobVisualState, truckVisualState } from "./marker-status";
import { OperationalMapControls } from "./OperationalMapControls";
import { TruckIntelPanel } from "./TruckIntelPanel";
import { DEFAULT_OPERATIONAL_LAYERS, type OperationalMapLayers } from "./types";

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
  /** Brighter basemap + lighter vignette when map is the console backdrop */
  consoleMode?: boolean;
};

type RouteLine = {
  key: string;
  positions: [number, number][];
  dashed?: boolean;
  primary?: boolean;
  label: string;
};

function laneById(lanes: FleetDispatchTruckLane[], id: string | undefined): FleetDispatchTruckLane | undefined {
  if (!id) return undefined;
  return lanes.find((l) => l.truck_id === id);
}

function MapViewportController({
  bounds,
  resetToken,
  onMapReady,
  consoleMode,
}: {
  bounds: ReturnType<typeof latLngBounds> | null;
  resetToken: number;
  onMapReady: (map: L.Map) => void;
  consoleMode?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [40, 48],
        maxZoom: 12,
      });
    }
  }, [bounds, consoleMode, map, resetToken]);

  return null;
}

function useFleetBounds(jobs: FleetDispatchJob[], truckLanes: FleetDispatchTruckLane[]) {
  return useMemo(() => {
    const points: Array<[number, number]> = [];
    for (const lane of truckLanes) {
      if (hasCoordinate(lane.latitude, lane.longitude)) {
        points.push([lane.latitude as number, lane.longitude as number]);
      }
    }
    for (const job of jobs) {
      if (hasCoordinate(job.site_latitude, job.site_longitude)) {
        points.push([job.site_latitude as number, job.site_longitude as number]);
      }
    }
    if (points.length === 0) {
      return { center: [33.95, -84.55] as [number, number], bounds: null };
    }
    const b = latLngBounds(points);
    const c = b.getCenter();
    return { center: [c.lat, c.lng] as [number, number], bounds: b };
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
  const mapRef = useRef<L.Map | null>(null);
  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  const recJobId = activeRecommendation?.rationale.entities.job_id;
  const recTopTruckId = activeRecommendation?.rationale.candidates?.[0]?.truck_id;
  const recAltTruckIds = useMemo(
    () =>
      activeRecommendation?.rationale.candidates?.slice(1, 3).map((candidate) => candidate.truck_id) ?? [],
    [activeRecommendation]
  );
  const topSnapshot = activeRecommendation?.rationale.candidate_snapshots?.[0];

  const { center, bounds } = useFleetBounds(jobs, truckLanes);
  const branchZones = useMemo(
    () => (layers.branches || layers.capacity ? computeBranchZones(truckLanes, branchCapacity) : []),
    [branchCapacity, layers.branches, layers.capacity, truckLanes]
  );

  const selectedTruckLane = useMemo(
    () => (highlightedTruckId ? truckLanes.find((l) => l.truck_id === highlightedTruckId) : null),
    [highlightedTruckId, truckLanes]
  );

  const routeLines = useMemo(() => {
    if (!layers.routes) return [] as RouteLine[];
    const lines: RouteLine[] = [];

    const addRoute = (
      truckId: string | undefined,
      jobId: string | undefined,
      key: string,
      label: string,
      opts?: { dashed?: boolean; primary?: boolean }
    ) => {
      const truck = laneById(truckLanes, truckId);
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
        key,
        label,
        dashed: opts?.dashed,
        primary: opts?.primary,
        positions: [
          [truck.latitude as number, truck.longitude as number],
          [job.site_latitude as number, job.site_longitude as number],
        ],
      });
    };

    if (layers.recommendations && activeRecommendation) {
      addRoute(recTopTruckId, recJobId, "rec-primary", "Recommended route", { primary: true });
      for (const altId of recAltTruckIds) {
        addRoute(altId, recJobId, `rec-alt-${altId}`, "Alternative route", { dashed: true });
      }
    } else if (selectedJobId && highlightedTruckId) {
      addRoute(highlightedTruckId, selectedJobId, "selection", "Selected assignment", { primary: true });
    }

    if (layers.deadhead && activeRecommendation && recTopTruckId && recJobId) {
      addRoute(recTopTruckId, recJobId, "deadhead", "Deadhead reduction path", { dashed: true, primary: true });
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

  const activeJob = recJobId ? jobs.find((j) => j.id === recJobId) : jobs.find((j) => j.id === selectedJobId);
  const activeRisk = activeJob ? operationalRiskMessage(activeJob) : null;
  const hasMapPoints =
    jobs.some((job) => hasCoordinate(job.site_latitude, job.site_longitude)) ||
    truckLanes.some((lane) => hasCoordinate(lane.latitude, lane.longitude));

  const toggleLayer = useCallback((key: keyof OperationalMapLayers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const handleCenterFleet = useCallback(() => {
    if (bounds?.isValid()) {
      mapRef.current?.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
    }
  }, [bounds]);
  const handleResetView = useCallback(() => setResetToken((t) => t + 1), []);

  const recConfidence = activeRecommendation ? recommendationConfidence(activeRecommendation) : null;

  return (
    <div className={`opmap-shell relative h-full w-full ${consoleMode ? "opmap-shell--console" : ""}`}>
      <MapContainer
        center={center}
        zoom={bounds ? 10 : 8}
        className="opmap-leaflet h-full w-full"
        bounds={bounds ?? undefined}
        boundsOptions={{ padding: [32, 32] }}
        zoomControl={false}
        attributionControl={false}
      >
        <MapViewportController
          bounds={bounds}
          resetToken={resetToken}
          onMapReady={handleMapReady}
          consoleMode={consoleMode}
        />

        {consoleMode ? (
          <>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          </>
        ) : (
          <>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
              opacity={0.22}
            />
          </>
        )}

        {(layers.branches || layers.capacity) &&
          branchZones.map((zone) => (
            <Circle
              key={`branch-${zone.branch_id}`}
              center={[zone.latitude, zone.longitude]}
              radius={zone.radiusMeters}
              pathOptions={{
                className: `opmap-branch-zone ${zone.utilization >= 0.85 ? "opmap-branch-zone--hot" : ""}`,
                color: "rgba(45, 212, 191, 0.28)",
                fillColor: "rgba(45, 212, 191, 0.05)",
                weight: 1,
                fillOpacity: layers.capacity ? 0.35 : 0.2,
              }}
            />
          ))}

        {routeLines.map((line) => (
          <Polyline
            key={line.key}
            positions={line.positions}
            pathOptions={{
              className: line.primary
                ? "opmap-route opmap-route--primary"
                : line.dashed
                  ? "opmap-route opmap-route--alt"
                  : "opmap-route",
              color: line.primary ? "#2dd4bf" : "#64748b",
              weight: line.primary ? 4 : 3,
              opacity: line.primary ? 0.9 : 0.55,
              dashArray: line.dashed ? "6 10" : undefined,
            }}
          />
        ))}

        {layers.trucks || layers.gpsHealth ? (
          <MarkerClusterGroup
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              return createClusterMarkerIcon(count, "truck");
            }}
          >
            {visibleTrucks.map((lane) => {
              const state = truckVisualState(lane, highlightedTruckId, recTopTruckId);
              const dimmed =
                layers.recommendations &&
                activeRecommendation &&
                recTopTruckId &&
                lane.truck_id !== recTopTruckId &&
                !recAltTruckIds.includes(lane.truck_id);
              return (
                <Marker
                  key={`truck-${lane.truck_id}`}
                  position={[lane.latitude as number, lane.longitude as number]}
                  icon={createTruckMarkerIcon(state, lane.unit_number)}
                  opacity={dimmed ? 0.45 : 1}
                  eventHandlers={{
                    click: () => onSelectTruck(highlightedTruckId === lane.truck_id ? null : lane.truck_id),
                  }}
                />
              );
            })}
          </MarkerClusterGroup>
        ) : null}

        {(layers.jobs || layers.revenueAtRisk) && visibleJobs.length > 0 ? (
          <MarkerClusterGroup
            maxClusterRadius={48}
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              return createClusterMarkerIcon(count, "job");
            }}
          >
            {visibleJobs.map((job) => {
              const state = jobVisualState(job, selectedJobId, recJobId);
              return (
                <Marker
                  key={`job-${job.id}`}
                  position={[job.site_latitude as number, job.site_longitude as number]}
                  icon={createJobMarkerIcon(state, job.priority)}
                  eventHandlers={{
                    click: () => onSelectJob(selectedJobId === job.id ? null : job.id),
                  }}
                />
              );
            })}
          </MarkerClusterGroup>
        ) : null}
      </MapContainer>

      {!consoleMode ? <div className="opmap-vignette pointer-events-none" aria-hidden /> : null}
      {consoleMode ? <div className="opmap-vignette opmap-vignette--light pointer-events-none" aria-hidden /> : null}

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
