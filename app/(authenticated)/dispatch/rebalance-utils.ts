/**
 * Workload rebalance: suggest moving jobs from overloaded crews to those with capacity.
 * Used by the Rebalance Suggestions modal; does not apply changes.
 */

import type { DispatchWorkOrder } from "./types";
import type { DispatchCrewWorkload } from "./dispatch-data";

const OVERLOAD_THRESHOLD = 0.9; // treat as overloaded when at or above 90% capacity
const MAX_SUGGESTIONS = 10;

function parseScheduledHours(wo: DispatchWorkOrder): number {
  if (wo.scheduled_start && wo.scheduled_end) {
    const start = new Date(wo.scheduled_start).getTime();
    const end = new Date(wo.scheduled_end).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return (end - start) / (60 * 60 * 1000);
    }
  }
  return wo.estimated_hours ?? 1;
}

function toComparableStatus(status: string | null | undefined): string {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s === "open") return "new";
  if (s === "assigned") return "ready_to_schedule";
  if (s === "closed") return "completed";
  return s;
}

export type RebalanceSuggestion = {
  workOrderId: string;
  workOrderNumber: string | null;
  title: string | null;
  fromCrewId: string;
  fromCrewName: string;
  toCrewId: string;
  toCrewName: string;
  scheduledDate: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  durationHours: number;
};

export type RebalanceInput = {
  scheduledWorkOrders: DispatchWorkOrder[];
  crewWorkloads: DispatchCrewWorkload[];
  selectedDate: string;
  maxSuggestions?: number;
  overloadThreshold?: number;
};

/**
 * Generate rebalance suggestions: move jobs from overloaded crews to crews with capacity.
 * Excludes in-progress and emergency-priority jobs. Returns at most maxSuggestions (default 10).
 */
export function computeRebalanceSuggestions(input: RebalanceInput): RebalanceSuggestion[] {
  const {
    scheduledWorkOrders,
    crewWorkloads,
    selectedDate,
    maxSuggestions = MAX_SUGGESTIONS,
    overloadThreshold = OVERLOAD_THRESHOLD,
  } = input;

  const crewById = new Map(crewWorkloads.map((c) => [c.id, c]));
  const overloadedCrewIds = new Set<string>();
  crewWorkloads.forEach((c) => {
    const capacity = c.dailyCapacityHours;
    const scheduled = c.workloadHoursToday;
    if (capacity <= 0) return;
    if (scheduled > capacity || scheduled >= capacity * overloadThreshold) {
      overloadedCrewIds.add(c.id);
    }
  });

  const candidates: DispatchWorkOrder[] = [];
  for (const wo of scheduledWorkOrders) {
    const crewId = wo.assigned_crew_id ?? null;
    if (!crewId || !overloadedCrewIds.has(crewId)) continue;
    const status = toComparableStatus(wo.status ?? "");
    if (status === "in_progress") continue;
    const priority = (wo.priority ?? "").toLowerCase();
    if (priority === "emergency") continue;
    candidates.push(wo);
  }

  candidates.sort((a, b) => {
    const startA = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0;
    const startB = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0;
    return startB - startA;
  });

  const remainingByCrew = new Map<string, number>();
  crewWorkloads.forEach((c) => {
    remainingByCrew.set(c.id, Math.max(0, c.availableCapacityHours));
  });

  const suggestions: RebalanceSuggestion[] = [];
  for (const wo of candidates) {
    if (suggestions.length >= maxSuggestions) break;
    const fromCrewId = wo.assigned_crew_id ?? "";
    const fromCrew = crewById.get(fromCrewId);
    if (!fromCrew) continue;
    const durationHours = parseScheduledHours(wo);
    let bestTarget: { id: string; name: string; remaining: number } | null = null;
    for (const c of crewWorkloads) {
      if (c.id === fromCrewId) continue;
      const remaining = remainingByCrew.get(c.id) ?? 0;
      if (remaining < durationHours) continue;
      if (!bestTarget || remaining > bestTarget.remaining) {
        bestTarget = { id: c.id, name: c.name, remaining };
      }
    }
    if (!bestTarget) continue;
    suggestions.push({
      workOrderId: wo.id,
      workOrderNumber: wo.work_order_number ?? null,
      title: wo.title ?? null,
      fromCrewId,
      fromCrewName: fromCrew.name,
      toCrewId: bestTarget.id,
      toCrewName: bestTarget.name,
      scheduledDate: wo.scheduled_date ?? selectedDate,
      scheduledStart: wo.scheduled_start ?? null,
      scheduledEnd: wo.scheduled_end ?? null,
      durationHours,
    });
    const newRemaining = bestTarget.remaining - durationHours;
    remainingByCrew.set(bestTarget.id, Math.round(newRemaining * 10) / 10);
  }

  return suggestions;
}
