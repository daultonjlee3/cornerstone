import type { SupabaseClient } from "@supabase/supabase-js";
import { dateOnlyUTC } from "@/src/lib/date-utils";
import { loadOperationsDashboardData } from "@/src/lib/dashboard/operations";
import { getTechnicianWorkloadSummary } from "@/src/lib/cornerstone-ai/retrieval";
import { TERMINAL_STATUSES_ARRAY } from "@/src/lib/work-orders/status";
import type {
  OptimizationProposal,
  AffectedRecord,
  OptimizationProposedAction,
  OptimizationProposalImpact,
  OptimizationProposalPriority,
} from "./types";

type GenerateOptimizationProposalsArgs = {
  supabase: SupabaseClient;
  companyIds: string[];
};

type WorkOrderRow = {
  id: string;
  work_order_number: string | null;
  title: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  asset_id: string | null;
  assigned_technician_id: string | null;
};

function todayIso(now = new Date()): string {
  return dateOnlyUTC(now);
}

function isTerminalStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const v = String(status).toLowerCase();
  return TERMINAL_STATUSES_ARRAY.map((s) => s.toLowerCase()).includes(v);
}

function normalizePriority(p: string | null | undefined): string {
  return String(p ?? "").toLowerCase();
}

function safeInt(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function priorityToProposalLevel(p: string | null | undefined): OptimizationProposalPriority {
  const v = normalizePriority(p);
  if (v === "emergency") return "urgent";
  if (v === "urgent") return "high";
  if (v === "high") return "medium";
  if (v === "medium") return "medium";
  return "low";
}

function impactFromFactors(factors: { overdue?: number; unassigned?: number; failureCount?: number; overloadTechs?: number }): OptimizationProposalImpact {
  const score =
    (factors.overdue ?? 0) * 2 +
    (factors.unassigned ?? 0) * 1.5 +
    (factors.failureCount ?? 0) * 1.8 +
    (factors.overloadTechs ?? 0) * 2;
  if (score >= 20) return "high";
  if (score >= 10) return "medium";
  return "low";
}

function pickBestUnderutilizedTechnician(
  techWorkload: Array<{ technician_id: string; technician_name: string | null; open_count: number }>
): { technicianId: string | null; technicianLabel: string | null } {
  const candidates = techWorkload
    .filter((t) => t.technician_id && t.technician_name) // prefer named
    .sort((a, b) => a.open_count - b.open_count || String(a.technician_name ?? "").localeCompare(String(b.technician_name ?? "")));
  const best = candidates[0] ?? techWorkload.sort((a, b) => a.open_count - b.open_count)[0];
  return {
    technicianId: best?.technician_id ?? null,
    technicianLabel: best?.technician_name ?? null,
  };
}

function scoreWorkOrderForTodayRanking(row: WorkOrderRow, repeatedFailureCount: number): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const due = row.due_date ? row.due_date : null;
  const overdue = due ? due < todayIso() : false;
  const dueToday = due ? due === todayIso() : false;
  const p = normalizePriority(row.priority);

  const unassigned = !row.assigned_technician_id;

  if (overdue) {
    score += 8;
    reasons.push("Overdue");
  }

  if (p === "emergency") {
    score += 8;
    reasons.push("Emergency priority");
  } else if (p === "urgent") {
    score += 7;
    reasons.push("Urgent priority");
  } else if (p === "high") {
    score += 5;
    reasons.push("High priority");
  }

  if (dueToday) {
    score += 4;
    reasons.push("Due today");
  }

  if (unassigned) {
    score += 3;
    reasons.push("Unassigned");
  }

  if (repeatedFailureCount > 0) {
    const w = Math.min(3, repeatedFailureCount);
    score += 3 * w;
    reasons.push(`${repeatedFailureCount} recent failures on this asset`);
  }

  return { score, reasons };
}

function buildAffectedRecordFromWorkOrder(row: WorkOrderRow): AffectedRecord {
  return {
    id: row.id,
    work_order_number: row.work_order_number,
    title: row.title,
    due_date: row.due_date,
    priority: row.priority,
    assetId: row.asset_id,
    technicianId: row.assigned_technician_id,
  };
}

function buildAssignWorkOrdersAction(action: { filter: "unassigned" | "overdue" | "urgent"; technicianId: string | null; maxRecords: number; reassignExisting: boolean }): OptimizationProposedAction {
  return {
    actionType: "assign_work_orders",
    parameters: {
      filter: action.filter,
      technicianId: action.technicianId,
      maxRecords: action.maxRecords,
      reassignExisting: action.reassignExisting,
    },
  };
}

function buildCreateWorkOrderAction(action: { companyId: string; title: string; description?: string; due_date?: string | null; priority?: string | null; category?: string | null; assetId?: string | null }): OptimizationProposedAction {
  return {
    actionType: "create_work_order",
    parameters: {
      companyId: action.companyId,
      title: action.title,
      description: action.description ?? null,
      due_date: action.due_date ?? null,
      priority: action.priority ?? null,
      category: action.category ?? null,
      assetId: action.assetId ?? null,
    },
  };
}

export async function generateOptimizationProposals({
  supabase,
  companyIds,
}: GenerateOptimizationProposalsArgs): Promise<OptimizationProposal[]> {
  if (companyIds.length === 0) return [];

  const [operations, techWorkload] = await Promise.all([
    loadOperationsDashboardData({ supabase, companyIds }),
    getTechnicianWorkloadSummary(supabase, companyIds, { from: todayIso(), to: todayIso() }),
  ]);

  const today = todayIso();

  const overdueCount = safeInt(operations.kpis.overdueWorkOrders);
  const unassignedWorkOrders = safeInt(operations.kpis.unassignedWorkOrders);
  const unassignedUrgentCount = await (async () => {
    const notTerminalStatus = `(${TERMINAL_STATUSES_ARRAY.join(",")})`;
    const { count } = await supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .in("priority", ["urgent", "emergency"])
      .is("assigned_technician_id", null)
      .is("assigned_crew_id", null)
      .is("vendor_id", null)
      .in("status", ["new", "ready_to_schedule", "scheduled"])
      .not("status", "in", notTerminalStatus);
    return safeInt(count);
  })();

  const techSorted = [...techWorkload].sort((a, b) => a.open_count - b.open_count);
  const bestUnderutilized = pickBestUnderutilizedTechnician(techSorted.map((t) => ({ ...t })));
  const overloaded = techSorted.filter((t) => t.open_count >= 8);
  const underutilized = techSorted.filter((t) => t.open_count > 0 && t.open_count <= 2);

  // Asset failure pattern map (from operations dashboard pre-aggregation)
  const failureMap = new Map<string, number>();
  const failureCountToRecord = new Map<string, { asset_name: string; failure_count: number }>();
  for (const row of operations.alerts.repeatedFailures ?? []) {
    failureMap.set(row.asset_id, row.failure_count);
    failureCountToRecord.set(row.asset_id, { asset_name: row.asset_name, failure_count: row.failure_count });
  }

  // Work order candidates for daily prioritization
  const { data: workOrderRowsRaw } = await supabase
    .from("work_orders")
    .select("id, work_order_number, title, due_date, priority, status, asset_id, assigned_technician_id")
    .in("company_id", companyIds)
    .not("status", "in", `(completed,cancelled)`)
    .limit(60);

  const workOrderRows: WorkOrderRow[] = ((workOrderRowsRaw ?? []) as unknown as WorkOrderRow[]).map((r) => ({
    ...r,
    asset_id: r.asset_id ?? null,
    assigned_technician_id: r.assigned_technician_id ?? null,
    status: r.status ?? null,
    priority: r.priority ?? null,
    due_date: r.due_date ?? null,
    work_order_number: r.work_order_number ?? null,
    title: r.title ?? null,
  }));

  const scored = workOrderRows
    .filter((r) => !isTerminalStatus(r.status))
    .map((r) => {
      const failureCount = r.asset_id ? failureMap.get(r.asset_id) ?? 0 : 0;
      const { score, reasons } = scoreWorkOrderForTodayRanking(r, failureCount);
      return { row: r, score, reasons, failureCount };
    });

  // Keep only top for today view
  const topTodayJobs = scored
    .sort((a, b) => b.score - a.score || String(a.row.due_date ?? "").localeCompare(String(b.row.due_date ?? "")))
    .slice(0, 6);

  const topJobCount = topTodayJobs.length;

  const proposals: OptimizationProposal[] = [];
  const companyId = companyIds[0];

  // 1) Auto-dispatch proposal
  if (unassignedWorkOrders > 0 && bestUnderutilized.technicianId) {
    const maxRecords = Math.min(10, unassignedWorkOrders);
    const proposedAction = buildAssignWorkOrdersAction({
      filter: "unassigned",
      technicianId: bestUnderutilized.technicianId,
      maxRecords,
      reassignExisting: false,
    });
    const impactedTechLabel = bestUnderutilized.technicianLabel ?? "Technician";
    const rationale = `Unassigned work orders are waiting in the queue. Dispatching them to ${impactedTechLabel} reduces idle time and speeds up start.`;
    proposals.push({
      id: `opt:auto-dispatch:${today}:${maxRecords}`,
      type: "auto_dispatch",
      title: "Auto-dispatch unassigned work",
      summary: `${Math.min(unassignedWorkOrders, 10)} work order${unassignedWorkOrders === 1 ? "" : "s"} can be assigned more efficiently.`,
      rationale: `${rationale} (Score: unassigned=${unassignedWorkOrders}, workload=${techSorted.find((t) => t.technician_id === bestUnderutilized.technicianId)?.open_count ?? 0})`,
      impact: impactFromFactors({ unassigned: unassignedWorkOrders }),
      priority: unassignedUrgentCount > 0 ? "high" : "medium",
      proposedAction,
      affectedRecords: topTodayJobs.filter((j) => !j.row.assigned_technician_id).slice(0, 3).map((j) => buildAffectedRecordFromWorkOrder(j.row)),
      confirmationRequired: true,
    });
  }

  // 2) Daily prioritization proposal (prioritize + optionally assign)
  if (topJobCount > 0) {
    const hasOverdue = overdueCount > 0;
    const filter: "overdue" | "urgent" | "unassigned" = hasOverdue ? "overdue" : unassignedUrgentCount > 0 ? "urgent" : "unassigned";
    const maxRecords = Math.min(5, topJobCount);

    const techId = bestUnderutilized.technicianId ?? null;
    const proposedAction = techId
      ? buildAssignWorkOrdersAction({
          filter,
          technicianId: techId,
          maxRecords,
          reassignExisting: hasOverdue,
        })
      : undefined;

    const topReasons = topTodayJobs[0]?.reasons ?? [];
    const targetLabel = bestUnderutilized.technicianLabel ?? "the lightest-loaded technician";
    const rationale = `These jobs rank highest using deterministic signals: overdue (high), urgent/emergency priority, due today, unassigned work, and repeated failures on the same asset. Target technician for assignment: ${targetLabel}. Top reason: ${topReasons[0] ?? "high operational impact"}.`;

    proposals.push({
      id: `opt:prioritize:${today}:${filter}`,
      type: "prioritize",
      title: "Daily priority plan",
      summary: `These ${Math.min(topJobCount, 3)} jobs should be addressed first today.`,
      rationale,
      impact: impactFromFactors({ overdue: overdueCount }),
      priority: overdueCount > 0 ? "urgent" : "high",
      proposedAction,
      affectedRecords: topTodayJobs.slice(0, 3).map((j) => buildAffectedRecordFromWorkOrder(j.row)),
      confirmationRequired: !!proposedAction,
    });
  }

  // 3) Workload rebalancing proposal
  if (overloaded.length > 0 && underutilized.length > 0 && bestUnderutilized.technicianId) {
    const overloadedCount = overloaded.length;
    const targetTech = underutilized.sort((a, b) => a.open_count - b.open_count)[0];
    const affectedOverdue = scored
      .filter((s) => {
        const due = s.row.due_date ?? null;
        const isOverdue = due ? due < today : false;
        return isOverdue && s.row.assigned_technician_id && overloaded.some((t) => t.technician_id === s.row.assigned_technician_id);
      })
      .slice(0, 6)
      .map((s) => s.row);

    const maxRecords = Math.max(1, Math.min(6, affectedOverdue.length || 3));
    const proposedAction = buildAssignWorkOrdersAction({
      filter: "overdue",
      technicianId: targetTech.technician_id,
      maxRecords,
      reassignExisting: true,
    });

    const rationale = `Rebalancing reduces overload by moving overdue work toward lighter schedules. Overloaded: ${overloadedCount}. Target technician: ${targetTech.technician_name ?? targetTech.technician_id}.`;

    proposals.push({
      id: `opt:rebalance:${today}:${overloadedCount}`,
      type: "rebalance",
      title: "Workload rebalancing",
      summary: `Reassign overdue work to balance load across the team (up to ${maxRecords} jobs).`,
      rationale,
      impact: impactFromFactors({ overdue: overdueCount, overloadTechs: overloadedCount }),
      priority: overloadedCount >= 2 ? "urgent" : "high",
      proposedAction,
      affectedRecords: affectedOverdue.slice(0, 3).map((r) => buildAffectedRecordFromWorkOrder(r)),
      confirmationRequired: true,
    });
  }

  // 4) PM opportunity detection
  const topFailure = [...failureCountToRecord.entries()]
    .map(([assetId, rec]) => ({ assetId, ...rec }))
    .sort((a, b) => b.failure_count - a.failure_count)[0];

  if (topFailure && topFailure.failure_count >= 2) {
    const assetName = topFailure.asset_name ?? "Asset";
    const failureCount = topFailure.failure_count;
    const severity: OptimizationProposalPriority = failureCount >= 4 ? "high" : "medium";
    const proposedAction = buildCreateWorkOrderAction({
      companyId,
      assetId: topFailure.assetId ?? null,
      title: `PM: Investigate recurring failures for ${assetName}`,
      description: `This asset shows recurring issues (${failureCount} recent failure work orders). Create a PM-style work order to diagnose root cause and prevent repeat breakdowns.`,
      due_date: null,
      priority: failureCount >= 4 ? "urgent" : "medium",
      category: "preventive_maintenance",
    });

    proposals.push({
      id: `opt:pm:${today}:${topFailure.assetId}:${failureCount}`,
      type: "pm_opportunity",
      title: "PM opportunity",
      summary: `${assetName} has ${failureCount} recent failures. Create a preventive maintenance work order?`,
      rationale: `Repeated reactive work is a strong signal that a scheduled PM could reduce future outages.`,
      impact: "high",
      priority: severity,
      proposedAction,
      affectedRecords: [
        {
          id: topFailure.assetId ?? "",
          assetName,
          assetId: topFailure.assetId ?? null,
          failureCount,
          label: assetName,
        },
      ],
      confirmationRequired: true,
    });
  }

  // 5) Asset risk escalation
  if (topFailure && topFailure.failure_count >= 3) {
    const assetName = topFailure.asset_name ?? "Asset";
    const failureCount = topFailure.failure_count;
    const proposedAction = buildCreateWorkOrderAction({
      companyId,
      assetId: topFailure.assetId ?? null,
      title: `Review risk: ${assetName} reliability check`,
      description: `Escalate operational risk: ${assetName} has recurring failures (${failureCount} recent reactive work orders). Create a focused PM/reliability check to review condition and prevent end-of-life breakdowns.`,
      due_date: null,
      priority: "urgent",
      category: "preventive_maintenance",
    });

    proposals.push({
      id: `opt:asset-risk:${today}:${topFailure.assetId}:${failureCount}`,
      type: "asset_risk",
      title: "Asset risk escalation",
      summary: `${assetName} is at elevated risk and should be reviewed this week.`,
      rationale: `Risk rises when the same asset fails repeatedly in a short window. Preventive action reduces reactive load and overdue exposure.`,
      impact: "high",
      priority: "urgent",
      proposedAction,
      affectedRecords: [
        {
          id: topFailure.assetId ?? "",
          assetName,
          assetId: topFailure.assetId ?? null,
          failureCount,
          label: assetName,
        },
      ],
      confirmationRequired: true,
    });
  }

  // Final prioritization and limit (top 5)
  const priorityWeight: Record<OptimizationProposal["priority"], number> = {
    urgent: 1000,
    high: 600,
    medium: 300,
    low: 100,
  };
  const impactWeight: Record<OptimizationProposal["impact"], number> = {
    high: 300,
    medium: 160,
    low: 60,
  };

  return proposals
    .sort((a, b) => {
      const aw = priorityWeight[a.priority] + impactWeight[a.impact];
      const bw = priorityWeight[b.priority] + impactWeight[b.impact];
      return bw - aw;
    })
    .slice(0, 5);
}

