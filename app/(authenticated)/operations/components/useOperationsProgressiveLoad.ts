"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FleetTodayViewData, FleetOperationsSummary } from "@/src/types/fleet";
import type { FleetOperationsBriefing } from "@/src/lib/fleet/operations/load-briefing";
import type { FleetOperationsEnrichment } from "@/src/lib/fleet/operations/load-enrichment";
import {
  createEmptyTodayView,
  mergeBriefingIntoTodayView,
  mergeEnrichmentIntoTodayView,
  mergeSummaryIntoTodayView,
} from "@/src/lib/fleet/operations/merge-today-view";

export type OperationsSectionLoadState = {
  summary: boolean;
  briefing: boolean;
  enrichment: boolean;
};

export type OperationsSectionErrorState = {
  summary: string | null;
  briefing: string | null;
  enrichment: string | null;
};

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const start = performance.now();
  const res = await fetch(url, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  const data = (await res.json()) as T;
  if (process.env.NODE_ENV === "development") {
    console.info(`[Operations Performance] client ${url}: ${Math.round(performance.now() - start)}ms`);
  }
  return data;
}

/**
 * Progressive loader — summary first for sub-2s KPI paint, then briefing, then enrichment.
 */
export function useOperationsProgressiveLoad() {
  const date = todayDateOnly();
  const dateRef = useRef(date);
  dateRef.current = date;

  const [data, setData] = useState<FleetTodayViewData>(() => createEmptyTodayView(date));
  const [loaded, setLoaded] = useState<OperationsSectionLoadState>({
    summary: false,
    briefing: false,
    enrichment: false,
  });
  const [errors, setErrors] = useState<OperationsSectionErrorState>({
    summary: null,
    briefing: null,
    enrichment: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const params = new URLSearchParams({ date });

    const loadSummary = async () => {
      const summary = await fetchJson<FleetOperationsSummary>(
        `/api/fleet/operations/summary?${params.toString()}`,
        signal
      );
      if (signal.aborted) return;
      setData((prev) => mergeSummaryIntoTodayView(prev, summary));
      setLoaded((s) => ({ ...s, summary: true }));
    };

    const loadBriefing = async () => {
      const briefing = await fetchJson<FleetOperationsBriefing>(
        `/api/fleet/operations/briefing?${params.toString()}`,
        signal
      );
      if (signal.aborted) return;
      setData((prev) => mergeBriefingIntoTodayView(prev, briefing));
      setLoaded((s) => ({ ...s, briefing: true }));
    };

    const loadEnrichment = async () => {
      const enrichment = await fetchJson<FleetOperationsEnrichment>(
        `/api/fleet/operations/enrichment?${params.toString()}`,
        signal
      );
      if (signal.aborted) return;
      setData((prev) => mergeEnrichmentIntoTodayView(prev, enrichment));
      setLoaded((s) => ({ ...s, enrichment: true }));
    };

    void (async () => {
      try {
        await loadSummary();
      } catch (e) {
        if (!signal.aborted) {
          setErrors((s) => ({
            ...s,
            summary: e instanceof Error ? e.message : "Summary unavailable",
          }));
        }
      }

      if (signal.aborted) return;

      void loadBriefing().catch((e) => {
        if (!signal.aborted) {
          setErrors((s) => ({
            ...s,
            briefing: e instanceof Error ? e.message : "Briefing unavailable",
          }));
        }
      });

      void loadEnrichment().catch((e) => {
        if (!signal.aborted) {
          setErrors((s) => ({
            ...s,
            enrichment: e instanceof Error ? e.message : "Enrichment unavailable",
          }));
        }
      });
    })();

    return () => controller.abort();
  }, [date]);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams({ date: dateRef.current, refresh: "true" });
    try {
      const summary = await fetchJson<FleetOperationsSummary>(
        `/api/fleet/operations/summary?${params.toString()}`,
        new AbortController().signal
      );
      setData((prev) => mergeSummaryIntoTodayView(prev, summary));
      setLoaded((s) => ({ ...s, summary: true }));
    } catch {
      /* keep existing */
    }
    try {
      const briefing = await fetchJson<FleetOperationsBriefing>(
        `/api/fleet/operations/briefing?${params.toString()}`,
        new AbortController().signal
      );
      setData((prev) => mergeBriefingIntoTodayView(prev, briefing));
      setLoaded((s) => ({ ...s, briefing: true }));
    } catch {
      /* keep existing */
    }
    try {
      const enrichment = await fetchJson<FleetOperationsEnrichment>(
        `/api/fleet/operations/enrichment?${params.toString()}`,
        new AbortController().signal
      );
      setData((prev) => mergeEnrichmentIntoTodayView(prev, enrichment));
      setLoaded((s) => ({ ...s, enrichment: true }));
    } catch {
      /* keep existing */
    }
  }, []);

  return { data, loaded, errors, refresh };
}
