"use client";

import { useCallback, useRef } from "react";
import type { FleetKpiId, FleetKpiInsightPayload } from "@/src/lib/fleet/insights/types";

type CacheEntry = {
  data: FleetKpiInsightPayload;
  fetchedAt: number;
};

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<FleetKpiInsightPayload>>();

function cacheKey(kpiId: FleetKpiId, date: string): string {
  return `${kpiId}:${date}`;
}

async function fetchInsight(kpiId: FleetKpiId, date: string): Promise<FleetKpiInsightPayload> {
  const key = cacheKey(kpiId, date);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const params = new URLSearchParams({ kpi: kpiId, date });
      const res = await fetch(`/api/fleet/operations/kpi-insight?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Unable to load insight");
      const data = (await res.json()) as FleetKpiInsightPayload;
      cache.set(key, { data, fetchedAt: Date.now() });
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function useFleetKpiInsight(date: string) {
  const prefetchTimers = useRef<Map<FleetKpiId, ReturnType<typeof setTimeout>>>(new Map());

  const prefetch = useCallback(
    (kpiId: FleetKpiId) => {
      const existing = prefetchTimers.current.get(kpiId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        void fetchInsight(kpiId, date).catch(() => undefined);
        prefetchTimers.current.delete(kpiId);
      }, 120);
      prefetchTimers.current.set(kpiId, timer);
    },
    [date]
  );

  const load = useCallback((kpiId: FleetKpiId) => fetchInsight(kpiId, date), [date]);

  return { load, prefetch };
}

export function invalidateFleetKpiInsightCache(): void {
  cache.clear();
  inflight.clear();
}
