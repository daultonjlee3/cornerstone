"use client";

import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import type { FleetDispatchJob, FleetDispatchTruckLane } from "@/src/types/fleet";
import { hasCoordinate } from "../dispatch-map-utils";

type FleetDispatchMapPanelProps = {
  jobs: FleetDispatchJob[];
  truckLanes: FleetDispatchTruckLane[];
  selectedJobId: string | null;
  onSelectJob: (id: string | null) => void;
};

const truckPinIcon = divIcon({
  className: "dispatch-map-pin-shell",
  html: '<span class="dispatch-map-pin dispatch-map-pin-technician">T</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function jobPinIcon(selected: boolean) {
  return divIcon({
    className: "dispatch-map-pin-shell",
    html: `<span class="dispatch-map-pin dispatch-map-pin-status-ready ${selected ? "dispatch-map-pin-selected" : ""}">J</span>`,
    iconSize: selected ? [34, 34] : [28, 28],
    iconAnchor: selected ? [17, 17] : [14, 14],
  });
}

export function FleetDispatchMapPanel({
  jobs,
  truckLanes,
  selectedJobId,
  onSelectJob,
}: FleetDispatchMapPanelProps) {
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
      return { center: [39.8283, -98.5795] as [number, number], bounds: null };
    }
    const b = latLngBounds(points);
    const c = b.getCenter();
    return { center: [c.lat, c.lng] as [number, number], bounds: b };
  }, [jobs, truckLanes]);

  return (
    <MapContainer
      center={center}
      zoom={bounds ? 10 : 4}
      className="h-full w-full"
      bounds={bounds ?? undefined}
      boundsOptions={{ padding: [24, 24] }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {truckLanes.map((lane) => {
        if (!hasCoordinate(lane.latitude, lane.longitude)) return null;
        return (
          <Marker
            key={`truck-${lane.truck_id}`}
            position={[lane.latitude as number, lane.longitude as number]}
            icon={truckPinIcon}
          >
            <Popup>
              <p className="font-semibold">{lane.unit_number}</p>
              <p className="text-xs">{lane.truck_type}</p>
              <p className="text-xs text-[var(--muted)]">Status: {lane.telematics_status}</p>
            </Popup>
          </Marker>
        );
      })}
      {jobs.map((job) => {
        if (!hasCoordinate(job.site_latitude, job.site_longitude)) return null;
        const selected = selectedJobId === job.id;
        return (
          <Marker
            key={`job-${job.id}`}
            position={[job.site_latitude as number, job.site_longitude as number]}
            icon={jobPinIcon(selected)}
            eventHandlers={{
              click: () => onSelectJob(selected ? null : job.id),
            }}
          >
            <Popup>
              <p className="font-semibold">{job.title}</p>
              <p className="text-xs">{job.site_name}</p>
              {job.estimated_deadhead_miles != null ? (
                <p className="text-xs text-amber-700">
                  Est. deadhead: {job.estimated_deadhead_miles.toFixed(1)} mi (heuristic)
                  {job.estimated_travel_minutes != null
                    ? ` · ~${job.estimated_travel_minutes} min`
                    : ""}
                </p>
              ) : null}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
