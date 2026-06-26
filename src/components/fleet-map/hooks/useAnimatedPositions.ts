"use client";

import { useEffect, useRef, useState } from "react";
import { bearingDegrees } from "../utils/bearing";

export type AnimatedPosition = {
  latitude: number;
  longitude: number;
  bearing: number | null;
};

export type AnimatablePoint = {
  id: string;
  latitude: number;
  longitude: number;
};

type ActiveAnimation = {
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  startMs: number;
  bearing: number | null;
};

const DEFAULT_DURATION_MS = 1100;
const MIN_MOVE_METERS = 8;

function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const latM = (b.latitude - a.latitude) * 111_320;
  const lngM =
    (b.longitude - a.longitude) * 111_320 * Math.cos(((a.latitude + b.latitude) * Math.PI) / 360);
  return Math.hypot(latM, lngM);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Smoothly interpolates marker coordinates when telemetry updates.
 * Only animates real coordinate changes — never invents movement.
 */
export function useAnimatedPositions(
  points: AnimatablePoint[],
  options?: { enabled?: boolean; durationMs?: number }
): Map<string, AnimatedPosition> {
  const enabled = options?.enabled ?? true;
  const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;

  const [positions, setPositions] = useState<Map<string, AnimatedPosition>>(() => new Map());
  const prevRef = useRef<Map<string, { latitude: number; longitude: number }>>(new Map());
  const activeRef = useRef<Map<string, ActiveAnimation>>(new Map());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const next = new Map<string, AnimatedPosition>();
    const prev = prevRef.current;
    const active = activeRef.current;

    for (const point of points) {
      const prior = prev.get(point.id);
      if (!prior) {
        next.set(point.id, {
          latitude: point.latitude,
          longitude: point.longitude,
          bearing: null,
        });
        prev.set(point.id, { latitude: point.latitude, longitude: point.longitude });
        continue;
      }

      const moved = distanceMeters(prior, point) >= MIN_MOVE_METERS;
      if (!enabled || !moved) {
        next.set(point.id, {
          latitude: point.latitude,
          longitude: point.longitude,
          bearing: moved ? bearingDegrees(prior, point) : null,
        });
        prev.set(point.id, { latitude: point.latitude, longitude: point.longitude });
        active.delete(point.id);
        continue;
      }

      active.set(point.id, {
        from: prior,
        to: { latitude: point.latitude, longitude: point.longitude },
        startMs: performance.now(),
        bearing: bearingDegrees(prior, point),
      });
      prev.set(point.id, { latitude: point.latitude, longitude: point.longitude });
    }

    for (const id of prev.keys()) {
      if (!points.some((p) => p.id === id)) {
        prev.delete(id);
        active.delete(id);
      }
    }

    if (active.size === 0) {
      setPositions(next);
      return;
    }

    setPositions((current) => {
      const merged = new Map(current);
      for (const [id, value] of next) merged.set(id, value);
      return merged;
    });

    const tick = (now: number) => {
      const frame = new Map<string, AnimatedPosition>();
      let running = false;

      for (const point of points) {
        const anim = active.get(point.id);
        if (!anim) {
          frame.set(point.id, {
            latitude: point.latitude,
            longitude: point.longitude,
            bearing: null,
          });
          continue;
        }

        const t = Math.min(1, (now - anim.startMs) / durationMs);
        const eased = easeOutCubic(t);
        frame.set(point.id, {
          latitude: lerp(anim.from.latitude, anim.to.latitude, eased),
          longitude: lerp(anim.from.longitude, anim.to.longitude, eased),
          bearing: anim.bearing,
        });

        if (t < 1) running = true;
        else active.delete(point.id);
      }

      setPositions(frame);
      if (running) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [durationMs, enabled, points]);

  return positions;
}
