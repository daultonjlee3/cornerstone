"use client";

import { useEffect, useRef, useState } from "react";

type GeolocationPermissionState =
  | "unknown"
  | "granted"
  | "denied"
  | "unsupported";

type PortalLocationTrackerProps = {
  active: boolean;
};

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function PortalLocationTracker({ active }: PortalLocationTrackerProps) {
  const [permissionState, setPermissionState] =
    useState<GeolocationPermissionState>(() =>
      typeof navigator !== "undefined" && "geolocation" in navigator
        ? "unknown"
        : "unsupported"
    );
  const lastSentRef = useRef<{
    latitude: number;
    longitude: number;
    timestampMs: number;
  } | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!("geolocation" in navigator)) return;

    let watchId: number | null = null;
    let isMounted = true;

    const sendEvent = async (event: "enabled" | "disabled") => {
      await fetch("/api/portal/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      }).catch(() => null);
    };

    const sendPosition = async (
      latitude: number,
      longitude: number,
      accuracy: number | null
    ) => {
      const nowMs = Date.now();
      const previous = lastSentRef.current;
      if (previous) {
        const elapsed = (nowMs - previous.timestampMs) / 1000;
        const movedKm = haversineKm(
          latitude,
          longitude,
          previous.latitude,
          previous.longitude
        );
        if (elapsed < 15 && movedKm < 0.02) {
          return;
        }
      }

      const response = await fetch("/api/portal/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy,
        }),
      }).catch(() => null);
      if (response?.ok) {
        lastSentRef.current = { latitude, longitude, timestampMs: nowMs };
      }
    };

    void sendEvent("enabled");
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!isMounted) return;
        setPermissionState("granted");
        void sendPosition(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy ?? null
        );
      },
      () => {
        if (!isMounted) return;
        setPermissionState("denied");
        void sendEvent("disabled");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 15_000,
      }
    );

    return () => {
      isMounted = false;
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }
      void sendEvent("disabled");
    };
  }, [active]);

  if (!active) return null;
  if (permissionState === "unknown" || permissionState === "granted") return null;

  return (
    <div className="mx-auto mb-3 w-full max-w-3xl rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      {permissionState === "unsupported"
        ? "Location tracking unavailable: this browser does not support geolocation."
        : "Location permission denied. Enable location services to share live position and routing updates."}
    </div>
  );
}
