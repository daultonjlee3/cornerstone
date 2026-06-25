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
  html: '<span class="dispatch-map-pin dispatch-map-pin-selected dispatch-map-pin-technician">★</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const truckPinAlternative = divIcon({
  className: "dispatch-map-pin-shell",
  html: '<span class="dispatch-map-pin dispatch-map-pin-hovered dispatch-map-pin-technician">T</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function truckPinDefault(highlighted: boolean) {
  return divIcon({
    className: "dispatch-map-pin-shell",
    html: `<span class="dispatch-map-pin dispatch-map-pin-technician ${highlighted ? "dispatch-map-pin-selected" : ""}">T</span>`,
    iconSize: highlighted ? [32, 32] : [28, 28],
    iconAnchor: highlighted ? [16, 16] : [14, 14],
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
  const extra = [selected ? "dispatch-map-pin-selected" : "", recommended ? "dispatch-map-pin-hovered" : ""]
    .filter(Boolean)
    .join(" ");
  return divIcon({
    className: "dispatch-map-pin-shell",
    html: `<span class="dispatch-map-pin ${priorityClass} ${extra}">J</span>`,
    iconSize: selected || recommended ? [34, 34] : [28, 28],
    iconAnchor: selected || recommended ? [17, 17] : [14, 14],
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
      addRoute(recTopTruckId, recJobId, "rec-primary", "#2563eb", "Recommended route");
      for (const altId of recAltTruckIds) {
        addRoute(altId, recJobId, `rec-alt-${altId}`, "#94a3b8", "Alternative", true);
      }
    } else if (selectedJobId && highlightedTruckId) {
      addRoute(highlightedTruckId, selectedJobId, "selection", "#0ea5e9", "Selected assignment");
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
        className="h-full w-full"
        bounds={bounds ?? undefined}
        boundsOptions={{ padding: [24, 24] }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

      <div className="absolute left-2 top-2 z-[1000] flex items-center gap-1.5 rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/90 px-2 py-1 text-[10px] shadow-[var(--elevation-1)]">
        <span className="font-semibold text-[var(--text-muted-strong)]">Live map</span>
        <span className="text-[var(--muted)]">
          {truckLanes.length} trucks · {jobs.length} jobs
        </span>
        {selectedJobId ? (
          <button
            type="button"
            className="pointer-events-auto rounded border border-[var(--surface-border-subtle)] px-1 py-0.5 text-[9px] font-semibold text-[var(--text-muted-strong)]"
            onClick={() => onSelectJob(null)}
          >
            Clear selection
          </button>
        ) : null}
      </div>

      {showLegend ? (
        <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] max-w-[220px] rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/92 p-2 text-[10px] shadow-[var(--elevation-1)]">
          <p className="font-bold uppercase tracking-wide text-[var(--muted)]">Map intelligence</p>
          {routeLines.map((line) => (
            <div key={line.key} className="mt-1 flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4"
                style={{
                  background: line.dashed
                    ? `repeating-linear-gradient(90deg, ${line.color} 0 4px, transparent 4px 8px)`
                    : line.color,
                }}
              />
              {line.label}
            </div>
          ))}
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-blue-600">★</span> Recommended truck
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">T</span> Alternative
          </div>
        </div>
      ) : null}

      {activeRisk ? (
        <div className="pointer-events-none absolute right-2 top-2 z-[1000] max-w-[180px] rounded-lg border border-[color-mix(in_srgb,var(--status-danger)_30%,transparent)] bg-[var(--status-danger-subtle)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--status-danger)] shadow-[var(--elevation-1)]">
          ⚠ {activeRisk}
        </div>
      ) : null}

      {!hasMapPoints ? (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
          <div className="rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/95 px-3 py-2 text-center shadow-[var(--elevation-1)]">
            <p className="text-xs font-semibold text-[var(--foreground)]">Map awaiting telemetry</p>
            <p className="text-[10px] text-[var(--muted)]">
              Truck and job markers appear when coordinates are available.
            </p>
          </div>
        </div>
      ) : null}

      {/* Future-ready: branch capacity overlays attach here via branchCapacity GeoJSON layer */}
      <div className="pointer-events-none absolute right-2 bottom-2 z-[1000] hidden rounded border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/92 px-1.5 py-0.5 text-[9px] text-[var(--muted)] lg:block">
        Branch overlays · coming soon
      </div>
    </div>
  );
}
