"use client";

import { useEffect, useRef } from "react";
import type {
  FleetDispatchBoardData,
  FleetRecommendationInstance,
  FleetRecommendationRecalculationNotice,
  FleetTodayViewData,
} from "@/src/types/fleet";
import {
  buildMinimalDispatchIntel,
  mergeIntegrationHealthIntoIntel,
} from "@/src/lib/fleet/dispatch/minimal-intel";

type UseDispatchSecondaryLoadArgs = {
  board: FleetDispatchBoardData;
  selectedDate: string;
  branchId: string | null;
  onIntelUpdate: (intel: FleetTodayViewData) => void;
  onRecommendationsUpdate: (
    recs: FleetRecommendationInstance[],
    notice: FleetRecommendationRecalculationNotice | null,
    refreshing: boolean
  ) => void;
  onRecError: (message: string | null) => void;
};

/** Lazy-load recommendations, integration health, and full generation after shell render. */
export function useDispatchSecondaryLoad({
  board,
  selectedDate,
  branchId,
  onIntelUpdate,
  onRecommendationsUpdate,
  onRecError,
}: UseDispatchSecondaryLoadArgs) {
  const boardRef = useRef(board);
  boardRef.current = board;

  const onIntelUpdateRef = useRef(onIntelUpdate);
  const onRecommendationsUpdateRef = useRef(onRecommendationsUpdate);
  const onRecErrorRef = useRef(onRecError);
  onIntelUpdateRef.current = onIntelUpdate;
  onRecommendationsUpdateRef.current = onRecommendationsUpdate;
  onRecErrorRef.current = onRecError;

  useEffect(() => {
    let cancelled = false;
    const perfStart = performance.now();
    const currentBoard = boardRef.current;

    const baseIntel = buildMinimalDispatchIntel(currentBoard, selectedDate);
    onIntelUpdateRef.current(baseIntel);
    onRecErrorRef.current(null);

    const recParams = new URLSearchParams({ date: selectedDate });
    if (branchId?.trim()) recParams.set("branch_id", branchId.trim());

    const fastParams = new URLSearchParams(recParams);
    fastParams.set("defer_generation", "true");
    fastParams.set("skip_history", "true");

    async function loadCachedRecommendations() {
      const res = await fetch(`/api/fleet/recommendations?${fastParams.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("recommendations");
      return res.json();
    }

    async function loadFullRecommendations() {
      const res = await fetch(`/api/fleet/recommendations?${recParams.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("recommendations-full");
      return res.json();
    }

    async function loadIntegrationHealth() {
      const res = await fetch("/api/fleet/integration-health", { cache: "no-store" });
      if (!res.ok) return null;
      return res.json() as Promise<{ integrationHealth: FleetTodayViewData["integrationHealth"] }>;
    }

    void (async () => {
      try {
        const [recPayload, healthPayload] = await Promise.all([
          loadCachedRecommendations(),
          loadIntegrationHealth(),
        ]);
        if (cancelled) return;

        const cachedMs = Math.round(performance.now() - perfStart);
        onRecommendationsUpdateRef.current(
          recPayload.pending ?? [],
          recPayload.recalculationNotice ?? null,
          Boolean(recPayload.refreshing)
        );

        let intel = {
          ...baseIntel,
          recommendations: recPayload,
          pendingActionCount:
            (recPayload.pending?.length ?? 0) +
            baseIntel.exceptions.filter((e) => e.severity === "critical").length,
        };
        if (healthPayload?.integrationHealth) {
          intel = mergeIntegrationHealthIntoIntel(
            intel,
            boardRef.current,
            healthPayload.integrationHealth
          );
        }
        onIntelUpdateRef.current(intel);

        if (process.env.NODE_ENV === "development") {
          console.info(
            `[Dispatch Performance] client-secondary\n  cached recommendations: ${cachedMs}ms\n  pending: ${recPayload.pending?.length ?? 0}\n  refreshing: ${Boolean(recPayload.refreshing)}`
          );
        }

        if (recPayload.refreshing) {
          const fullStart = performance.now();
          const fullPayload = await loadFullRecommendations();
          if (cancelled) return;
          onRecommendationsUpdateRef.current(
            fullPayload.pending ?? [],
            fullPayload.recalculationNotice ?? null,
            false
          );
          onIntelUpdateRef.current({
            ...intel,
            recommendations: fullPayload,
            pendingActionCount:
              (fullPayload.pending?.length ?? 0) +
              intel.exceptions.filter((e) => e.severity === "critical").length,
          });
          if (process.env.NODE_ENV === "development") {
            console.info(
              `[Dispatch Performance] client-secondary\n  full recommendations: ${Math.round(performance.now() - fullStart)}ms\n  pending: ${fullPayload.pending?.length ?? 0}`
            );
          }
        }
      } catch {
        if (!cancelled) onRecErrorRef.current("Unable to load recommendations.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId, selectedDate]);
}
