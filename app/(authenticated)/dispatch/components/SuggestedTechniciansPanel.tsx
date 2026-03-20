"use client";

import { useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import type { DispatchWorkOrder } from "../types";
import type { DispatchTechnicianWorkload } from "../dispatch-data";
import { toDateOnlyString } from "@/src/lib/date-utils";
import { haversineMiles, estimateTravelMinutes, hasCoordinate } from "../dispatch-map-utils";

const MAX_SUGGESTIONS = 5;

/** Format ISO time as "9:30 AM". */
function formatTimeAM(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Compute next available time for a technician on the given date from their scheduled jobs. */
function getNextOpening(
  technicianId: string,
  workOrders: DispatchWorkOrder[],
  selectedDate: string
): string | null {
  const dayStart = new Date(`${selectedDate}T08:00:00`).getTime();
  const techJobs = workOrders.filter(
    (wo) =>
      wo.assigned_technician_id === technicianId &&
      toDateOnlyString(wo.scheduled_date) === selectedDate
  );
  if (techJobs.length === 0) return formatTimeAM(`${selectedDate}T08:00:00`);
  const sorted = [...techJobs].sort(
    (a, b) => (new Date(b.scheduled_end ?? 0).getTime() - new Date(a.scheduled_end ?? 0).getTime())
  );
  const lastEnd = sorted[0]?.scheduled_end;
  if (!lastEnd) return formatTimeAM(`${selectedDate}T08:00:00`);
  return formatTimeAM(lastEnd);
}

export type SuggestedTechnician = {
  technician: DispatchTechnicianWorkload;
  distanceMiles: number;
  travelMinutes: number;
  availableHours: number;
  nextOpening: string | null;
  score: number;
};

/** Score: lower is better. Combines travel time (weight 0.4), inverse capacity (0.35), inverse schedule fit (0.25). */
function rankSuggestions(
  jobLat: number,
  jobLng: number,
  technicians: DispatchTechnicianWorkload[],
  workOrders: DispatchWorkOrder[],
  selectedDate: string
): SuggestedTechnician[] {
  const withCoords = technicians.filter((t) =>
    hasCoordinate(t.latitude, t.longitude)
  );
  const jobPoint = { latitude: jobLat, longitude: jobLng };
  const scored: SuggestedTechnician[] = withCoords.map((technician) => {
    const start = {
      latitude: technician.latitude as number,
      longitude: technician.longitude as number,
    };
    const distanceMiles = haversineMiles(start, jobPoint);
    const travelMinutes = estimateTravelMinutes(distanceMiles);
    const availableHours = Math.max(0, technician.availableCapacityHours ?? 0);
    const nextOpening = getNextOpening(technician.id, workOrders, selectedDate);
    const cap = technician.dailyCapacityHours ?? 8;
    const workloadNorm = cap > 0 ? (technician.workloadHoursToday ?? 0) / cap : 0;
    const travelTimeWeight = Math.min(1, travelMinutes / 60) * 0.4;
    const availableCapacityWeight = (1 - Math.min(1, availableHours / 8)) * 0.35;
    const scheduleFitWeight = workloadNorm * 0.25;
    const score = travelTimeWeight + availableCapacityWeight + scheduleFitWeight;
    return {
      technician,
      distanceMiles,
      travelMinutes,
      availableHours,
      nextOpening,
      score,
    };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, MAX_SUGGESTIONS);
}

type SuggestedTechniciansPanelProps = {
  selectedWorkOrder: DispatchWorkOrder | null;
  technicians: DispatchTechnicianWorkload[];
  workOrders: DispatchWorkOrder[];
  selectedDate: string;
  onAssign: (workOrderId: string, technicianId: string) => void;
  assigning?: boolean;
};

export function SuggestedTechniciansPanel({
  selectedWorkOrder,
  technicians,
  workOrders,
  selectedDate,
  onAssign,
  assigning = false,
}: SuggestedTechniciansPanelProps) {
  const suggestions = useMemo(() => {
    if (!selectedWorkOrder) return [];
    const lat = selectedWorkOrder.latitude;
    const lng = selectedWorkOrder.longitude;
    if (!hasCoordinate(lat, lng)) return [];
    return rankSuggestions(
      lat as number,
      lng as number,
      technicians,
      workOrders,
      selectedDate
    );
  }, [selectedWorkOrder?.id, selectedWorkOrder?.latitude, selectedWorkOrder?.longitude, technicians, workOrders, selectedDate]);

  if (!selectedWorkOrder) {
    return (
      <section className="flex flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
        <div className="border-b border-[var(--card-border)] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Best Technicians
          </p>
        </div>
        <div className="flex-1 p-3 text-center text-xs text-[var(--muted)]">
          Select a work order to see suggestions.
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
      <div className="border-b border-[var(--card-border)] px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Best Technicians
        </p>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {suggestions.length === 0 ? (
          <p className="text-center text-xs text-[var(--muted)]">
            No technicians with location data.
          </p>
        ) : (
          suggestions.map((s, i) => (
            <div
              key={s.technician.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  {i + 1}. {s.technician.name}
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  {s.travelMinutes} min away
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  {s.availableHours.toFixed(1)}h available
                </p>
                {s.nextOpening ? (
                  <p className="text-[11px] text-[var(--muted-strong)]">
                    Next opening: {s.nextOpening}
                  </p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 text-[11px]"
                onClick={() => onAssign(selectedWorkOrder.id, s.technician.id)}
                disabled={assigning}
              >
                Assign
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
