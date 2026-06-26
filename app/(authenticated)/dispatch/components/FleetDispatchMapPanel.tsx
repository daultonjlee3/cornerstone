"use client";

import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import type { FleetDispatchJob, FleetDispatchTruckLane, FleetRecommendationInstance } from "@/src/types/fleet";
import { hasCoordinate } from "../dispatch-map-utils";
import { operationalRiskMessage } from "./fleet-dispatch-utils";

type FleetDispatchMapPanelProps = {
  jobs: FleetDispatchJob[];
  truckLanes: FleetDispatchTruckLane[];
  selectedJobId: string | null;
  highlightedTruckId: string | null;
  activeRecommendation: FleetRecommendationInstance | null;
  onSelectJob: (id: string | null) => void;
};

const truckPinRecommended = divIcon({
  className: "dispatch-map-pin-shell",
  html: '<span class="dispatch-map-pin-fleet dispatch-map-pin-fleet--selected">T</span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const truckPinAlternative = divIcon({
  className: "dispatch-map-pin-shell",
  html: '<span class="dispatch-map-pin-fleet dispatch-map-pin-fleet--alt">T</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function truckPinDefault(highlighted: boolean) {
  return divIcon({
    className: "dispatch-map-pin-shell",
    html: `<span class="dispatch-map-pin-fleet ${highlighted ? "dispatch-map-pin-fleet--selected" : ""}">T</span>`,
    iconSize: highlighted ? [40, 40] : [36, 36],
    iconAnchor: highlighted ? [20, 20] : [18, 18],
  });
}

function jobPinIcon(priority: FleetDispatchJob["priority"], selected: boolean, recommended: boolean) {
  const priorityClass =
    priority === "urgent"
      ? "dispatch-map-pin-urgent"
      : priority === "high"
        ? "dispatch-map-pin-high"
        : priority === "medium"
          ? "dispatch-map-pin-medium"
          : "dispatch-map-pin-low";
  const extra = [selected ? "dispatch-map-pin-job--selected" : "", recommended ? "dispatch-map-pin-hovered" : ""]
    .filter(Boolean)
    .join(" ");
  return divIcon({
    className: "dispatch-map-pin-shell",
    html: `<span class="dispatch-map-pin-job ${priorityClass} ${extra}">J</span>`,
    iconSize: selected || recommended ? [38, 38] : [32, 32],
    iconAnchor: selected || recommended ? [19, 19] : [16, 16],
  });
}

function laneById(lanes: FleetDispatchTruckLane[], id: string | undefined): FleetDispatchTruckLane | undefined {
  if (!id) return undefined;
  return lanes.find((l) => l.truck_id === id);
}

export function FleetDispatchMapPanel({
  jobs,
  truckLanes,
  selectedJobId,
  highlightedTruckId,
  activeRecommendation,
  onSelectJob,
}: FleetDispatchMapPanelProps) {
  const recJobId = activeRecommendation?.rationale.entities.job_id;
  const recTopTruckId = activeRecommendation?.rationale.candidates?.[0]?.truck_id;
  const recAltTruckIds = useMemo(
    () =>
      activeRecommendation?.rationale.candidates
        ?.slice(1, 3)
        .map((candidate) => candidate.truck_id) ?? [],
    [activeRecommendation]
  );
  const activeJob = recJobId ? jobs.find((j) => j.id === recJobId) : jobs.find((j) => j.id === selectedJobId);
  const activeRisk = activeJob ? operationalRiskMessage(activeJob) : null;

  const routeLines = useMemo(() => {
    const lines: Array<{ key: string; positions: [number, number][]; dashed?: boolean; color: string; label: string }> = [];

    const addRoute = (
      truckId: string | undefined,
      jobId: string | undefined,
      key: string,
      color: string,
      label: string,
      dashed?: boolean
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
        color,
        label,
        dashed,
        positions: [
          [truck.latitude as number, truck.longitude as number],
          [job.site_latitude as number, job.site_longitude as number],
        ],
      });
    };

    if (activeRecommendation) {
      addRoute(recTopTruckId, recJobId, "rec-primary", "#2dd4bf", "Recommended route");
      for (const altId of recAltTruckIds) {
        addRoute(altId, recJobId, `rec-alt-${altId}`, "#64748b", "Alternative", true);
      }
    } else if (selectedJobId && highlightedTruckId) {
      addRoute(highlightedTruckId, selectedJobId, "selection", "#2dd4bf", "Selected assignment");
    }

    return lines;
  }, [
    activeRecommendation,
    highlightedTruckId,
    jobs,
    recAltTruckIds,
    recJobId,
    recTopTruckId,
    selectedJobId,
    truckLanes,
  ]);

  const { center, bounds } = useMemo(() => {
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

  const showLegend = activeRecommendation != null || routeLines.length > 0;
  const hasMapPoints = jobs.some((job) => hasCoordinate(job.site_latitude, job.site_longitude)) ||
    truckLanes.some((lane) => hasCoordinate(lane.latitude, lane.longitude));

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={bounds ? 10 : 8}
        className="h-full w-full dispatch-mission__leaflet-map"
        bounds={bounds ?? undefined}
        boundsOptions={{ padding: [24, 24] }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {routeLines.map((line) => (
          <Polyline
            key={line.key}
            positions={line.positions}
            pathOptions={{
              color: line.color,
              weight: line.dashed ? 3 : 4,
              opacity: 0.85,
              dashArray: line.dashed ? "8 8" : undefined,
            }}
          />
        ))}

        {truckLanes.map((lane) => {
          if (!hasCoordinate(lane.latitude, lane.longitude)) return null;
          const isRecTop = lane.truck_id === recTopTruckId;
          const isRecAlt = recAltTruckIds.includes(lane.truck_id);
          const highlighted = lane.truck_id === highlightedTruckId;
          const icon = isRecTop
            ? truckPinRecommended
            : isRecAlt
              ? truckPinAlternative
              : truckPinDefault(highlighted);

          return (
            <Marker
              key={`truck-${lane.truck_id}`}
              position={[lane.latitude as number, lane.longitude as number]}
              icon={icon}
            >
              <Popup>
                <p className="font-semibold">Truck {lane.unit_number}</p>
                <p className="text-xs">{lane.truck_type} · {lane.branch_name}</p>
                <p className="text-xs capitalize">GPS: {lane.telematics_status}</p>
                {isRecTop ? <p className="text-xs font-semibold text-blue-600">★ Recommended</p> : null}
                {isRecAlt ? <p className="text-xs text-slate-500">Alternative option</p> : null}
              </Popup>
            </Marker>
          );
        })}

        {jobs.map((job) => {
          if (!hasCoordinate(job.site_latitude, job.site_longitude)) return null;
          const selected = selectedJobId === job.id;
          const recommended = recJobId === job.id;
          return (
            <Marker
              key={`job-${job.id}`}
              position={[job.site_latitude as number, job.site_longitude as number]}
              icon={jobPinIcon(job.priority, selected, recommended)}
              eventHandlers={{
                click: () => onSelectJob(selected ? null : job.id),
              }}
            >
              <Popup>
                <p className="font-semibold">{job.title}</p>
                <p className="text-xs">{job.site_name}</p>
                {operationalRiskMessage(job) ? (
                  <p className="text-xs font-medium text-red-600">{operationalRiskMessage(job)}</p>
                ) : null}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="dispatch-mission__map-overlay absolute left-3 top-3 z-[1000] flex items-center gap-2.5 px-3 py-2 text-xs">
        <span className="dispatch-mission__live-badge">
          <span className="dispatch-mission__live-dot" aria-hidden />
          Live
        </span>
        <span className="text-[var(--text-muted)]">
          {truckLanes.length} trucks · {jobs.length} jobs
        </span>
        {selectedJobId ? (
          <button
            type="button"
            className="pointer-events-auto rounded-[var(--radius-sm)] border border-[var(--surface-border-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted-strong)] transition hover:border-[var(--brand-operational)]/30"
            onClick={() => onSelectJob(null)}
          >
            Clear selection
          </button>
        ) : null}
      </div>

      {showLegend ? (
        <div className="dispatch-mission__map-overlay pointer-events-none absolute bottom-3 left-3 z-[1000] max-w-[240px] p-3 text-xs">
          <p className="cs-text-micro cs-text-muted font-bold uppercase tracking-wide">Map intelligence</p>
          {routeLines.map((line) => (
            <div key={line.key} className="mt-2 flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-5"
                style={{
                  background: line.dashed
                    ? `repeating-linear-gradient(90deg, ${line.color} 0 4px, transparent 4px 8px)`
                    : line.color,
                }}
              />
              {line.label}
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2 text-[var(--brand-operational)]">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[9px] font-bold">
              T
            </span>
            Recommended truck
          </div>
        </div>
      ) : null}

      {activeRisk ? (
        <div className="dispatch-mission__map-overlay pointer-events-none absolute right-3 top-3 z-[1000] max-w-[220px] border-[color-mix(in_srgb,var(--status-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--status-danger-subtle)_88%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--status-danger)]">
          {activeRisk}
        </div>
      ) : null}

      {!hasMapPoints ? (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-[color-mix(in_srgb,var(--surface-canvas)_40%,transparent)]">
          <div className="dispatch-mission__map-overlay max-w-xs px-4 py-3 text-center">
            <p className="cs-text-body font-semibold">Map awaiting telemetry</p>
            <p className="cs-text-caption cs-text-muted mt-1">
              Truck and job markers appear when coordinates are available.
            </p>
          </div>
        </div>
      ) : null}

      <div className="dispatch-mission__map-overlay pointer-events-none absolute bottom-3 right-3 z-[1000] hidden px-2.5 py-1.5 text-[10px] text-[var(--text-muted)] lg:block">
        Branch overlays · coming soon
      </div>
    </div>
  );
}
