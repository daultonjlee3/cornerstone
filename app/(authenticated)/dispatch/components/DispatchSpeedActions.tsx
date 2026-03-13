"use client";

import { useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import type { DispatchWorkOrder } from "../types";
import type { DispatchTechnicianWorkload } from "../dispatch-data";
import { haversineMiles, hasCoordinate } from "../dispatch-map-utils";

type DispatchSpeedActionsProps = {
  selectedWorkOrder: DispatchWorkOrder | null;
  technicians: DispatchTechnicianWorkload[];
  onAssign: (workOrderId: string, technicianId: string) => void;
  assigning?: boolean;
};

export function DispatchSpeedActions({
  selectedWorkOrder,
  technicians,
  onAssign,
  assigning = false,
}: DispatchSpeedActionsProps) {
  const { bestId, nearestId, leastLoadedId } = useMemo(() => {
    if (!selectedWorkOrder?.id || !hasCoordinate(selectedWorkOrder.latitude, selectedWorkOrder.longitude)) {
      return { bestId: null, nearestId: null, leastLoadedId: null };
    }
    const job = { latitude: selectedWorkOrder.latitude as number, longitude: selectedWorkOrder.longitude as number };
    const withCoords = technicians.filter((t) => hasCoordinate(t.latitude, t.longitude));
    if (withCoords.length === 0) return { bestId: null, nearestId: null, leastLoadedId: null };

    const byDistance = [...withCoords].sort((a, b) => {
      const dA = haversineMiles(job, { latitude: a.latitude as number, longitude: a.longitude as number });
      const dB = haversineMiles(job, { latitude: b.latitude as number, longitude: b.longitude as number });
      return dA - dB;
    });
    const nearestId = byDistance[0]?.id ?? null;

    const byAvailable = [...withCoords].sort((a, b) => (b.availableCapacityHours ?? 0) - (a.availableCapacityHours ?? 0));
    const leastLoadedId = byAvailable[0]?.id ?? null;

    const byScore = [...withCoords].map((t) => {
      const dist = haversineMiles(job, { latitude: t.latitude as number, longitude: t.longitude as number });
      const travelNorm = Math.min(1, (dist / 20) * 60 / 60);
      const cap = t.dailyCapacityHours ?? 8;
      const workloadNorm = cap > 0 ? (t.workloadHoursToday ?? 0) / cap : 0;
      const availNorm = 1 - Math.min(1, (t.availableCapacityHours ?? 0) / 8);
      const score = travelNorm * 0.4 + availNorm * 0.35 + workloadNorm * 0.25;
      return { id: t.id, score };
    });
    byScore.sort((a, b) => a.score - b.score);
    const bestId = byScore[0]?.id ?? null;

    return { bestId, nearestId, leastLoadedId };
  }, [selectedWorkOrder?.id, selectedWorkOrder?.latitude, selectedWorkOrder?.longitude, technicians]);

  if (!selectedWorkOrder) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/60 px-2 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Quick assign</span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-[11px]"
        disabled={!bestId || assigning}
        onClick={() => bestId && onAssign(selectedWorkOrder.id, bestId)}
      >
        Best Technician
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-[11px]"
        disabled={!nearestId || assigning}
        onClick={() => nearestId && onAssign(selectedWorkOrder.id, nearestId)}
      >
        Nearest
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-[11px]"
        disabled={!leastLoadedId || assigning}
        onClick={() => leastLoadedId && onAssign(selectedWorkOrder.id, leastLoadedId)}
      >
        Least Loaded
      </Button>
    </div>
  );
}
