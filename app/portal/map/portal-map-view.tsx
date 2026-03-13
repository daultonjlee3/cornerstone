"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type PortalMapJob = {
  id: string;
  title: string;
  priority: string;
  status: string;
  scheduled_time: string | null;
  address: string;
  latitude: number;
  longitude: number;
};

type RouteState = {
  points: [number, number][];
  etaMinutes: number | null;
  distanceMiles: number | null;
  nextTurnInstruction: string | null;
};

const currentLocationIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>
        <circle cx='14' cy='14' r='10' fill='#2563eb' opacity='0.25'/>
        <circle cx='14' cy='14' r='5' fill='#2563eb'/>
      </svg>`
    ),
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const jobIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='36' viewBox='0 0 24 34'>
        <path d='M12 0C5.4 0 0 5.4 0 12c0 8.8 12 22 12 22s12-13.2 12-22C24 5.4 18.6 0 12 0z' fill='#ef4444'/>
        <circle cx='12' cy='12' r='5' fill='white'/>
      </svg>`
    ),
  iconSize: [26, 36],
  iconAnchor: [13, 36],
});

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const distanceKm = 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distanceKm * 0.621371;
}

function headingInstruction(fromLat: number, fromLon: number, toLat: number, toLon: number): string {
  const y = Math.sin((toLon - fromLon) * (Math.PI / 180)) * Math.cos(toLat * (Math.PI / 180));
  const x =
    Math.cos(fromLat * (Math.PI / 180)) * Math.sin(toLat * (Math.PI / 180)) -
    Math.sin(fromLat * (Math.PI / 180)) *
      Math.cos(toLat * (Math.PI / 180)) *
      Math.cos((toLon - fromLon) * (Math.PI / 180));
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  if (brng >= 45 && brng < 135) return "Head east";
  if (brng >= 135 && brng < 225) return "Head south";
  if (brng >= 225 && brng < 315) return "Head west";
  return "Head north";
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function PortalMapView({
  jobs,
  initialLatitude,
  initialLongitude,
}: {
  jobs: PortalMapJob[];
  initialLatitude: number | null;
  initialLongitude: number | null;
}) {
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    initialLatitude != null && initialLongitude != null
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : null
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs[0]?.id ?? null);
  const [route, setRoute] = useState<RouteState | null>(null);
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setPermissionDenied(false);
        setCurrentPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setPermissionDenied(true);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const loadRoute = async () => {
      if (!selectedJob || !currentPosition) {
        setRoute(null);
        return;
      }

      const straightDistance = haversineMiles(
        currentPosition.latitude,
        currentPosition.longitude,
        selectedJob.latitude,
        selectedJob.longitude
      );
      const fallback: RouteState = {
        points: [
          [currentPosition.latitude, currentPosition.longitude],
          [selectedJob.latitude, selectedJob.longitude],
        ],
        distanceMiles: Number(straightDistance.toFixed(2)),
        etaMinutes: Math.max(1, Math.round((straightDistance / 28) * 60)),
        nextTurnInstruction: `${headingInstruction(
          currentPosition.latitude,
          currentPosition.longitude,
          selectedJob.latitude,
          selectedJob.longitude
        )} toward destination`,
      };

      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${currentPosition.longitude},${currentPosition.latitude};${selectedJob.longitude},${selectedJob.latitude}` +
          `?overview=full&geometries=geojson&steps=true`;
        const response = await fetch(url);
        if (!response.ok) {
          setRoute(fallback);
          return;
        }
        const json = (await response.json()) as {
          routes?: Array<{
            distance?: number;
            duration?: number;
            geometry?: { coordinates?: Array<[number, number]> };
            legs?: Array<{
              steps?: Array<{
                name?: string;
                maneuver?: { modifier?: string; type?: string };
              }>;
            }>;
          }>;
        };
        const best = json.routes?.[0];
        if (!best?.geometry?.coordinates?.length) {
          setRoute(fallback);
          return;
        }
        const points = best.geometry.coordinates.map(
          (pair) => [pair[1], pair[0]] as [number, number]
        );
        const distanceMiles = Number(((best.distance ?? 0) * 0.000621371).toFixed(2));
        const etaMinutes = Math.max(1, Math.round((best.duration ?? 0) / 60));
        const turnStep =
          best.legs?.[0]?.steps?.find(
            (step) => (step.maneuver?.type ?? "continue") !== "depart"
          ) ?? best.legs?.[0]?.steps?.[0];
        const modifier = turnStep?.maneuver?.modifier;
        const roadName = (turnStep?.name ?? "").trim();
        const nextTurnInstruction = modifier
          ? `${modifier[0].toUpperCase()}${modifier.slice(1)}${roadName ? ` on ${roadName}` : ""}`
          : fallback.nextTurnInstruction;

        setRoute({
          points,
          distanceMiles,
          etaMinutes,
          nextTurnInstruction,
        });
      } catch {
        setRoute(fallback);
      }
    };

    void loadRoute();
  }, [selectedJob, currentPosition]);

  const mapCenter: [number, number] = currentPosition
    ? [currentPosition.latitude, currentPosition.longitude]
    : jobs[0]
      ? [jobs[0].latitude, jobs[0].longitude]
      : [37.7749, -122.4194];

  return (
    <div className="space-y-3">
      {permissionDenied ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Location permission denied. Enable location services for live tracking and routing.
        </p>
      ) : null}

      <section className="h-[50vh] min-h-[320px] overflow-hidden rounded-xl border border-[var(--card-border)]">
        <MapContainer center={mapCenter} zoom={12} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {currentPosition ? (
            <Marker
              position={[currentPosition.latitude, currentPosition.longitude]}
              icon={currentLocationIcon}
            >
              <Popup>
                <p className="text-sm font-medium">Your current location</p>
              </Popup>
            </Marker>
          ) : null}

          {jobs.map((job) => (
            <Marker
              key={job.id}
              position={[job.latitude, job.longitude]}
              icon={jobIcon}
              eventHandlers={{ click: () => setSelectedJobId(job.id) }}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-800">{job.title}</p>
                  <p className="text-xs text-slate-600">
                    {job.priority} · {job.status} · {formatTime(job.scheduled_time)}
                  </p>
                  <p className="text-xs text-slate-600">{job.address}</p>
                  <Link
                    href={`/portal/work-orders/${job.id}`}
                    className="inline-block rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    Open job
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}

          {route && route.points.length >= 2 ? (
            <Polyline
              positions={route.points}
              pathOptions={{ color: "#1d4ed8", weight: 4, opacity: 0.75 }}
            />
          ) : null}
        </MapContainer>
      </section>

      <section className="space-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Select job for directions
        </label>
        <select
          className="ui-select"
          value={selectedJobId ?? ""}
          onChange={(event) => setSelectedJobId(event.target.value || null)}
        >
          <option value="">Choose job</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} · {formatTime(job.scheduled_time)}
            </option>
          ))}
        </select>

        {selectedJob ? (
          <div className="space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">{selectedJob.title}</p>
            <p className="text-xs text-[var(--muted)]">{selectedJob.address}</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md border border-[var(--card-border)] px-2 py-1">
                <p className="text-[var(--muted)]">Distance</p>
                <p className="font-semibold text-[var(--foreground)]">
                  {route?.distanceMiles != null ? `${route.distanceMiles} mi` : "—"}
                </p>
              </div>
              <div className="rounded-md border border-[var(--card-border)] px-2 py-1">
                <p className="text-[var(--muted)]">ETA</p>
                <p className="font-semibold text-[var(--foreground)]">
                  {route?.etaMinutes != null ? `${route.etaMinutes} min` : "—"}
                </p>
              </div>
              <div className="rounded-md border border-[var(--card-border)] px-2 py-1">
                <p className="text-[var(--muted)]">Status</p>
                <p className="font-semibold text-[var(--foreground)]">{selectedJob.status}</p>
              </div>
            </div>
            <div className="rounded-md border border-[var(--card-border)] px-2 py-1.5">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Next Turn</p>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {route?.nextTurnInstruction ?? "Select a job to preview route instructions."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedJob.latitude},${selectedJob.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-center text-sm font-semibold text-[var(--foreground)]"
              >
                Open in Google Maps
              </a>
              <Link
                href={`/portal/work-orders/${selectedJob.id}`}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-white"
              >
                Open Job
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Select a job marker or pick from the dropdown to view in-app routing.
          </p>
        )}
      </section>
    </div>
  );
}
