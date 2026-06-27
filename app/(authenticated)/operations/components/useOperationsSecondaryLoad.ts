"use client";

import { useEffect, useRef } from "react";
import type { FleetTodayViewData } from "@/src/types/fleet";

/** Background full load after instant shell — recommendations, ROI, day-over-day. */
export function useOperationsSecondaryLoad(
  enabled: boolean,
  date: string,
  onUpdate: (data: FleetTodayViewData) => void
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void (async () => {
      try {
        const params = new URLSearchParams({ date });
        const res = await fetch(`/api/fleet/today-view?${params.toString()}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as FleetTodayViewData;
        if (!cancelled) onUpdateRef.current(payload);
      } catch {
        /* shell remains usable */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date, enabled]);
}
