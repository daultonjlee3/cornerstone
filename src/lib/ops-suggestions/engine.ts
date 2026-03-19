import type { SupabaseClient } from "@supabase/supabase-js";
import { dateOnlyUTC } from "@/src/lib/date-utils";
import { getTechnicianWorkloadSummary } from "@/src/lib/cornerstone-ai/retrieval";
import { loadOperationsDashboardData } from "@/src/lib/dashboard/operations";
import { OPEN_ACTIVE_STATUSES, TERMINAL_STATUSES_ARRAY } from "@/src/lib/work-orders/status";
import type { OperationSuggestion } from "./types";

import type { AiActionType } from "@/src/lib/cornerstone-ai/types";

type GenerateSuggestionsArgs = {
  supabase: SupabaseClient;
  companyIds: string[];
};

const PRIORITY_WEIGHT: Record<OperationSuggestion["priority"], number> = {
  high: 1000,
  medium: 400,
  low: 100,
};

function safeInt(v: number | null | undefined): number {
  if (!Number.isFinite(v as number)) return 0;
  return Math.max(0, Math.trunc(v as number));
}

function todayIso(supabaseNow = new Date()): string {
  return dateOnlyUTC(supabaseNow);
}

function toActionType(actionType: AiActionType): AiActionType {
  return actionType;
}

export async function generateSuggestions({
  supabase,
  companyIds,
}: GenerateSuggestionsArgs): Promise<OperationSuggestion[]> {
  if (companyIds.length === 0) return [];

  const [operations, technicianWorkload] = await Promise.all([
    loadOperationsDashboardData({ supabase, companyIds }),
    getTechnicianWorkloadSummary(supabase, companyIds, { from: todayIso(), to: todayIso() }),
  ]);

  const notTerminalStatus = `(${TERMINAL_STATUSES_ARRAY.join(",")})`;
  const today = todayIso();

  const overdueCount = safeInt(operations.kpis.overdueWorkOrders);
  const repeatedFailures = operations.alerts.repeatedFailures ?? [];

  // Rule 2: Unassigned urgent work (urgent + no technician + no crew + not completed/cancelled)
  const { count: unassignedUrgentCountRaw } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .in("company_id", companyIds)
    .in("priority", ["urgent", "emergency"])
    .is("assigned_technician_id", null)
    .is("assigned_crew_id", null)
    .is("vendor_id", null)
    .in("status", [...OPEN_ACTIVE_STATUSES])
    .not("status", "in", notTerminalStatus);

  const unassignedUrgentCount = safeInt(unassignedUrgentCountRaw ?? 0);

  // Technician overload / underutilization
  const overloadedTechnicians = technicianWorkload.filter((t) => t.open_count >= 8);
  const underutilizedTechnicians = technicianWorkload
    .filter((t) => t.open_count > 0 && t.open_count <= 2)
    .sort((a, b) => a.open_count - b.open_count);

  // Build suggestions
  const suggestions: OperationSuggestion[] = [];

  if (overdueCount > 0) {
    const maxRecords = Math.min(overdueCount, 10);
    suggestions.push({
      id: `overdue:${today}:${overdueCount}`,
      type: "overdue_work_orders",
      insight: `You have ${overdueCount} overdue work order${overdueCount === 1 ? "" : "s"}.`,
      recommendation: "Assign overdue jobs to the right technician or prioritize them for next.",
      actionType: toActionType("assign_work_orders"),
      parameters: { filter: "overdue", technicianId: null, reassignExisting: false, maxRecords },
      priority: "high",
    });
  }

  if (unassignedUrgentCount > 0) {
    const maxRecords = Math.min(unassignedUrgentCount, 10);
    suggestions.push({
      id: `unassigned-urgent:${today}:${unassignedUrgentCount}`,
      type: "unassigned_urgent_work",
      insight: `${unassignedUrgentCount} urgent job${unassignedUrgentCount === 1 ? "" : "s"} are unassigned.`,
      recommendation: "Assign these urgent jobs so crews can start immediately.",
      actionType: toActionType("assign_work_orders"),
      parameters: { filter: "urgent", technicianId: null, reassignExisting: false, maxRecords },
      priority: "high",
    });
  }

  if (overloadedTechnicians.length > 0) {
    const overloadedCount = overloadedTechnicians.length;
    const underTech = underutilizedTechnicians[0];
    suggestions.push({
      id: `tech-overload:${today}:${overloadedCount}`,
      type: "technician_overload",
      insight: `${overloadedCount} technician${overloadedCount === 1 ? "" : "s"} look overbooked.`,
      recommendation: "Rebalance work by assigning additional overdue tasks to lighter schedules.",
      actionType: toActionType("assign_work_orders"),
      parameters: {
        filter: "overdue",
        technicianId: underTech?.technician_id ?? null,
        reassignExisting: true,
        maxRecords: 10,
      },
      priority: "high",
    });
  }

  if (underutilizedTechnicians.length >= 2) {
    const lowCount = underutilizedTechnicians.length;
    const underTech = underutilizedTechnicians[0];
    suggestions.push({
      id: `tech-underutilized:${today}:${lowCount}`,
      type: "underutilized_technicians",
      insight: `${lowCount} technician${lowCount === 1 ? "" : "s"} have low workload.`,
      recommendation: "Assign more work to keep schedules balanced and reduce delays.",
      actionType: toActionType("assign_work_orders"),
      parameters: {
        filter: "unassigned",
        technicianId: underTech?.technician_id ?? null,
        reassignExisting: false,
        maxRecords: 10,
      },
      priority: "medium",
    });
  }

  // Rule 5: Repeated asset failures => suggest creating a PM-style work order
  const topRepeated = repeatedFailures
    .filter((r) => r.failure_count >= 2)
    .sort((a, b) => b.failure_count - a.failure_count)[0];

  if (topRepeated) {
    const assetId = topRepeated.asset_id;
    if (!assetId) return suggestions;
    const failureCount = topRepeated.failure_count;
    suggestions.push({
      id: `repeat-failures:${today}:${assetId}:${failureCount}`,
      type: "repeated_asset_failures",
      insight: `Asset ${topRepeated.asset_name ?? "has recurring issues"} shows ${failureCount} recent failures.`,
      recommendation: "Create a PM work order to investigate and prevent repeat breakdowns.",
      actionType: toActionType("create_work_order"),
      parameters: {
        companyId: companyIds[0] ?? null,
        title: `PM: Investigate recurring failures for ${topRepeated.asset_name ?? "asset"}`,
        description: "This asset has repeated failures recently. Create a focused PM-style work order to diagnose root cause and prevent recurrence.",
        due_date: null,
        priority: "medium",
        category: "preventive_maintenance",
        assetId: assetId ?? null,
      },
      priority: "medium",
    });
  }

  // Prioritize and limit to top 5
  const impactScore = (s: OperationSuggestion): number => {
    if (s.type === "overdue_work_orders") return overdueCount;
    if (s.type === "unassigned_urgent_work") return unassignedUrgentCount;
    if (s.type === "technician_overload") return overloadedTechnicians.length * 2;
    if (s.type === "underutilized_technicians") return underutilizedTechnicians.length;
    if (s.type === "repeated_asset_failures") return topRepeated?.failure_count ?? 0;
    return 0;
  };

  return suggestions
    .sort((a, b) => {
      const aw = PRIORITY_WEIGHT[a.priority] + impactScore(a);
      const bw = PRIORITY_WEIGHT[b.priority] + impactScore(b);
      return bw - aw;
    })
    .slice(0, 5);
}

