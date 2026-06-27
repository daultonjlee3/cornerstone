import type {
  FleetCommandCenterData,
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetMetricDelta,
  FleetRecommendationHistoryEntry,
  FleetRecommendationInstance,
  FleetRecommendationsResponse,
  FleetRecommendationRoiSummary,
  FleetTodayViewData,
  FleetUtilizationMartRow,
} from "@/src/types/fleet";
import { formatFleetCurrency, formatFleetHours, formatFleetMiles, formatFleetPercent } from "@/src/lib/fleet/ui/format";
import { buildDispatchExceptionHref } from "@/src/lib/fleet/ui/exception-actions";
import { fleetOperationsSectionHref } from "@/src/lib/fleet/ui/operations-sections";
import { getFleetKpiRegistryEntry } from "./kpi-registry";
import type {
  FleetInsightAction,
  FleetInsightRecommendation,
  FleetInsightRecord,
  FleetInsightTrend,
  FleetKpiId,
  FleetKpiInsightPayload,
} from "./types";

export type FleetInsightContext = {
  date: string;
  board: FleetDispatchBoardData;
  commandCenter: FleetCommandCenterData;
  recommendations: FleetRecommendationsResponse;
  recommendationRoi?: FleetRecommendationRoiSummary;
  changesSinceYesterday: FleetMetricDelta[];
  martRows: FleetUtilizationMartRow[];
};

function relOne<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function trendFromDelta(deltas: FleetMetricDelta[], key: string, label: string): FleetInsightTrend | undefined {
  const delta = deltas.find((d) => d.key === key);
  if (!delta) return undefined;
  let value: string | undefined;
  if (delta.delta != null) {
    if (delta.format === "percent") value = `${delta.delta >= 0 ? "+" : ""}${delta.delta.toFixed(1)}%`;
    else if (delta.format === "currency") value = `${delta.delta >= 0 ? "+" : ""}${formatFleetCurrency(delta.delta)}`;
    else value = `${delta.delta >= 0 ? "+" : ""}${Math.round(delta.delta)}`;
  }
  return { label, direction: delta.direction, value };
}

function gpsLabel(status: FleetDispatchTruckLane["telematics_status"]): string {
  if (status === "online") return "Online";
  if (status === "stale") return "Stale";
  return "Offline";
}

function currentJobLabel(lane: FleetDispatchTruckLane): string {
  const active = lane.jobs.find((j) => j.status === "in_progress") ?? lane.jobs[0];
  return active?.title ?? "—";
}

function dispatchActions(date: string, focus?: { jobId?: string; truckId?: string; branchId?: string }): FleetInsightAction[] {
  const href = buildDispatchExceptionHref(date, focus);
  return [
    { id: "open-dispatch", label: "Open dispatch", href },
    { id: "view-map", label: "View on map", href },
  ];
}

function mapRecommendations(recs: FleetRecommendationInstance[], date: string, limit = 6): FleetInsightRecommendation[] {
  return recs.slice(0, limit).map((rec) => ({
    id: rec.id,
    title: rec.rationale.title,
    detail: rec.rationale.reasons[0] ?? "Review assignment impact before accepting.",
    impact:
      rec.rationale.candidate_snapshots?.[0]?.estimated_contribution != null
        ? formatFleetCurrency(rec.rationale.candidate_snapshots[0].estimated_contribution)
        : undefined,
    href: buildDispatchExceptionHref(date, {
      jobId: rec.rationale.entities.job_id ?? undefined,
      truckId: rec.rationale.entities.truck_id ?? undefined,
    }),
  }));
}

function mapHistory(history: FleetRecommendationHistoryEntry[]): FleetInsightRecord[] {
  return history.slice(0, 12).map((entry) => ({
    id: entry.id,
    decision: entry.rationale.title,
    type: entry.recommendation_type.replace(/_/g, " "),
    outcome: entry.latest_outcome?.action?.replace(/_/g, " ") ?? "pending",
    when: entry.latest_outcome?.acted_at ?? entry.created_at,
  }));
}

function buildActiveTrucks(ctx: FleetInsightContext): FleetKpiInsightPayload {
  const meta = getFleetKpiRegistryEntry("active-trucks");
  const lanes = ctx.board.truckLanes.filter((l) => l.status === "active" && l.telematics_status === "online");
  return {
    kpiId: "active-trucks",
    title: meta.title,
    description: meta.description,
    lastUpdated: ctx.recommendations.generatedAt,
    primaryValue: String(ctx.commandCenter.activeTrucks),
    primaryLabel: "Trucks live on GPS",
    trend: trendFromDelta(ctx.changesSinceYesterday, "active_trucks", "vs yesterday"),
    summary: [
      { label: "Total fleet", value: String(ctx.commandCenter.truckCount) },
      { label: "On jobs", value: String(lanes.filter((l) => l.jobs.length > 0).length) },
      { label: "Idle online", value: String(lanes.filter((l) => l.jobs.length === 0).length) },
    ],
    records: lanes.map((lane) => ({
      id: lane.truck_id,
      unit: lane.unit_number,
      gps: gpsLabel(lane.telematics_status),
      operator: lane.operator_name ?? "Unassigned",
      branch: lane.branch_name ?? "—",
      current_job: currentJobLabel(lane),
      idle: lane.jobs.length === 0 ? formatFleetHours(lane.idle_hours ?? 0) : "—",
      last_ping: gpsLabel(lane.telematics_status),
    })),
    columns: [
      { key: "unit", label: "Truck" },
      { key: "gps", label: "GPS" },
      { key: "operator", label: "Operator" },
      { key: "branch", label: "Branch" },
      { key: "current_job", label: "Current job" },
      { key: "idle", label: "Idle", align: "right" },
    ],
    recommendations: mapRecommendations(
      ctx.recommendations.pending.filter((r) => r.recommendation_type === "truck_assignment"),
      ctx.date
    ),
    history: mapHistory(ctx.recommendations.history),
    historyColumns: [
      { key: "decision", label: "Decision" },
      { key: "outcome", label: "Outcome" },
      { key: "when", label: "When" },
    ],
    impactSummary: {
      estimatedImpact: formatFleetCurrency(ctx.commandCenter.recommendationOpportunity ?? 0),
      operationalScore: `${ctx.commandCenter.utilizationPercent?.toFixed(0) ?? "—"}% util`,
    },
    actions: [...dispatchActions(ctx.date), { id: "view-trucks", label: "View trucks", href: "/fleet/trucks" }],
  };
}

function classifyIdleOffline(lane: FleetDispatchTruckLane): string {
  if (lane.maintenance_note) return "maintenance";
  if (lane.telematics_status === "offline" || lane.telematics_status === "stale") return "offline";
  if (!lane.operator_name && !lane.operator_id) return "no-operator";
  return "idle";
}

function buildIdleOffline(ctx: FleetInsightContext): FleetKpiInsightPayload {
  const meta = getFleetKpiRegistryEntry("idle-offline");
  const flagged = ctx.board.truckLanes.filter((l) => {
    if (l.status !== "active") return false;
    const group = classifyIdleOffline(l);
    return group !== "idle" || (l.jobs.length === 0 && l.utilization <= 0.2);
  });
  const groups = ["idle", "offline", "maintenance", "no-operator"].map((id) => ({
    id,
    label:
      id === "offline" ? "Offline GPS" : id === "no-operator" ? "No operator" : id.charAt(0).toUpperCase() + id.slice(1),
    count: flagged.filter((l) => classifyIdleOffline(l) === id).length,
  }));
  return {
    kpiId: "idle-offline",
    title: meta.title,
    description: meta.description,
    lastUpdated: ctx.recommendations.generatedAt,
    primaryValue: String(ctx.commandCenter.idleTrucks),
    primaryLabel: "Units needing attention",
    summary: groups.map((g) => ({ label: g.label, value: String(g.count) })),
    groups,
    records: flagged.map((lane) => ({
      id: lane.truck_id,
      unit: lane.unit_number,
      group: classifyIdleOffline(lane),
      gps: gpsLabel(lane.telematics_status),
      operator: lane.operator_name ?? "—",
      branch: lane.branch_name ?? "—",
      issue: lane.maintenance_note ?? (lane.telematics_status !== "online" ? "GPS gap" : "Underutilized"),
    })),
    columns: [
      { key: "unit", label: "Truck" },
      { key: "group", label: "Group" },
      { key: "gps", label: "GPS" },
      { key: "operator", label: "Operator" },
      { key: "issue", label: "Issue" },
    ],
    recommendations: mapRecommendations(
      ctx.recommendations.pending.filter((r) => ["truck_assignment", "idle_truck_match"].includes(r.recommendation_type)),
      ctx.date
    ),
    history: [],
    historyColumns: [],
    impactSummary: { revenueProtected: formatFleetCurrency(ctx.commandCenter.contributionAtRisk ?? 0) },
    actions: [
      { id: "locate", label: "Locate", href: buildDispatchExceptionHref(ctx.date) },
      { id: "assign", label: "Assign", href: buildDispatchExceptionHref(ctx.date) },
      { id: "investigate", label: "Investigate", href: "/settings/integrations" },
    ],
  };
}

function jobRow(job: FleetDispatchJob): FleetInsightRecord {
  const late = job.scheduled_start && Date.parse(job.scheduled_start) < Date.now() && job.status !== "completed";
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    priority: job.priority,
    revenue: formatFleetCurrency(job.revenue_estimate ?? 0),
    branch: job.branch_name ?? "—",
    late: late ? "Yes" : "—",
  };
}

function buildJobsToday(ctx: FleetInsightContext): FleetKpiInsightPayload {
  const meta = getFleetKpiRegistryEntry("jobs-today");
  const { jobs, unassignedJobs: unassigned } = ctx.board;
  const emergency = jobs.filter((j) => j.priority === "urgent");
  const late = jobs.filter((j) => j.scheduled_start && Date.parse(j.scheduled_start) < Date.now() && j.status !== "completed");
  return {
    kpiId: "jobs-today",
    title: meta.title,
    description: meta.description,
    lastUpdated: ctx.recommendations.generatedAt,
    primaryValue: String(ctx.commandCenter.jobsToday),
    primaryLabel: "Jobs scheduled today",
    summary: [
      { label: "Assigned", value: String(jobs.length - unassigned.length) },
      { label: "Unassigned", value: String(unassigned.length) },
      { label: "Emergency", value: String(emergency.length) },
      { label: "Late", value: String(late.length) },
      { label: "Revenue", value: formatFleetCurrency(ctx.commandCenter.revenueScheduledToday ?? 0) },
    ],
    groups: [
      { id: "unassigned", label: "Unassigned", count: unassigned.length },
      { id: "emergency", label: "Emergency", count: emergency.length },
      { id: "late", label: "Late", count: late.length },
    ],
    records: [...unassigned, ...jobs.filter((j) => !unassigned.some((u) => u.id === j.id))].slice(0, 40).map(jobRow),
    columns: [
      { key: "title", label: "Job" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "revenue", label: "Revenue", align: "right" },
      { key: "late", label: "Late" },
    ],
    recommendations: mapRecommendations(ctx.recommendations.pending, ctx.date),
    history: mapHistory(ctx.recommendations.history),
    historyColumns: [
      { key: "decision", label: "Decision" },
      { key: "outcome", label: "Outcome" },
    ],
    impactSummary: {
      revenueProtected: formatFleetCurrency(ctx.commandCenter.revenueAtRisk ?? 0),
      estimatedImpact: formatFleetCurrency(ctx.commandCenter.contributionAtRisk ?? 0),
    },
    actions: [...dispatchActions(ctx.date), { id: "assign", label: "Assign", href: buildDispatchExceptionHref(ctx.date) }],
  };
}

function buildUtilization(ctx: FleetInsightContext): FleetKpiInsightPayload {
  const meta = getFleetKpiRegistryEntry("utilization");
  const branchRows = ctx.board.branchCapacity.map((b) => ({
    id: b.branch_id,
    name: b.branch_name,
    utilization: formatFleetPercent(b.utilization * 100),
    committed: formatFleetHours(b.committed_hours),
    type: "Branch",
  }));
  const truckRows = ctx.board.truckLanes.slice(0, 20).map((l) => ({
    id: l.truck_id,
    name: l.unit_number,
    utilization: formatFleetPercent(l.utilization * 100),
    committed: formatFleetHours(l.committed_hours),
    type: "Truck",
  }));
  const totalBillable = ctx.martRows.reduce((s, r) => s + Number(r.billable_hours ?? 0), 0);
  const totalHours = ctx.martRows.reduce((s, r) => s + Number(r.total_hours ?? 0), 0);
  const deadheadMi = ctx.martRows.reduce((s, r) => s + Number(r.deadhead_miles ?? 0), 0);
  return {
    kpiId: "utilization",
    title: meta.title,
    description: meta.description,
    lastUpdated: ctx.recommendations.generatedAt,
    primaryValue:
      ctx.commandCenter.utilizationPercent != null ? formatFleetPercent(ctx.commandCenter.utilizationPercent) : "—",
    primaryLabel: "Fleet billable utilization",
    trend: trendFromDelta(ctx.changesSinceYesterday, "utilization", "vs yesterday"),
    summary: [
      { label: "Billable %", value: totalHours > 0 ? formatFleetPercent((totalBillable / totalHours) * 100) : "—" },
      { label: "Deadhead mi", value: formatFleetMiles(deadheadMi) },
    ],
    records: [...branchRows, ...truckRows],
    columns: [
      { key: "type", label: "Type" },
      { key: "name", label: "Name" },
      { key: "utilization", label: "Utilization", align: "right" },
    ],
    recommendations: mapRecommendations(
      ctx.recommendations.pending.filter((r) => ["capacity_overload", "truck_assignment"].includes(r.recommendation_type)),
      ctx.date
    ),
    history: [],
    historyColumns: [],
    impactSummary: {
      operationalScore:
        ctx.commandCenter.utilizationPercent != null ? `${ctx.commandCenter.utilizationPercent.toFixed(0)}% fleet` : undefined,
    },
    actions: [
      { id: "rebalance", label: "Rebalance branch", href: buildDispatchExceptionHref(ctx.date) },
      { id: "move-truck", label: "Move truck", href: buildDispatchExceptionHref(ctx.date) },
    ],
  };
}

function buildEstContribution(ctx: FleetInsightContext): FleetKpiInsightPayload {
  const meta = getFleetKpiRegistryEntry("est-contribution");
  const byBranch = new Map<string, { name: string; contribution: number }>();
  for (const row of ctx.martRows) {
    const branch = relOne(row.branches);
    const prev = byBranch.get(row.branch_id) ?? { name: branch?.name ?? "Branch", contribution: 0 };
    prev.contribution += Number(row.contribution ?? 0);
    byBranch.set(row.branch_id, prev);
  }
  const trend = ctx.changesSinceYesterday.find((d) => d.key === "contribution");
  return {
    kpiId: "est-contribution",
    title: meta.title,
    description: meta.description,
    lastUpdated: ctx.recommendations.generatedAt,
    primaryValue: formatFleetCurrency(ctx.commandCenter.estimatedContributionToday ?? 0),
    primaryLabel: "Estimated contribution today",
    trend: trend
      ? { label: "vs yesterday", direction: trend.direction, value: trend.delta != null ? formatFleetCurrency(trend.delta) : undefined }
      : undefined,
    summary: [
      { label: "At risk", value: formatFleetCurrency(ctx.commandCenter.contributionAtRisk ?? 0) },
      { label: "Scheduled revenue", value: formatFleetCurrency(ctx.commandCenter.revenueScheduledToday ?? 0) },
    ],
    records: [
      ...[...byBranch.entries()].map(([id, v]) => ({
        id,
        name: v.name,
        contribution: formatFleetCurrency(v.contribution),
        type: "Branch",
      })),
      ...ctx.martRows.slice(0, 15).map((row) => ({
        id: row.truck_id,
        name: relOne(row.trucks)?.unit_number ?? row.truck_id.slice(0, 8),
        contribution: formatFleetCurrency(Number(row.contribution ?? 0)),
        type: "Truck",
      })),
    ],
    columns: [
      { key: "type", label: "Type" },
      { key: "name", label: "Name" },
      { key: "contribution", label: "Contribution", align: "right" },
    ],
    recommendations: mapRecommendations(ctx.recommendations.pending, ctx.date),
    history: mapHistory(ctx.recommendations.history),
    historyColumns: [
      { key: "decision", label: "Decision" },
      { key: "outcome", label: "Outcome" },
    ],
    impactSummary: {
      estimatedImpact: formatFleetCurrency(ctx.commandCenter.recommendationOpportunity ?? 0),
      revenueProtected: formatFleetCurrency(ctx.recommendationRoi?.revenueProtected ?? ctx.commandCenter.revenueAtRisk ?? 0),
    },
    actions: [
      { id: "opportunities", label: "View opportunities", href: fleetOperationsSectionHref("recommendations") },
      { id: "performance", label: "Fleet performance", href: "/reports/operations" },
    ],
  };
}

function buildDeadheadCost(ctx: FleetInsightContext): FleetKpiInsightPayload {
  const meta = getFleetKpiRegistryEntry("deadhead-cost");
  const rows = [...ctx.martRows].sort((a, b) => Number(b.deadhead_cost ?? 0) - Number(a.deadhead_cost ?? 0)).slice(0, 20);
  return {
    kpiId: "deadhead-cost",
    title: meta.title,
    description: meta.description,
    lastUpdated: ctx.recommendations.generatedAt,
    primaryValue: formatFleetCurrency(ctx.commandCenter.deadheadCostToday ?? 0),
    primaryLabel: "Deadhead cost today",
    trend: trendFromDelta(ctx.changesSinceYesterday, "deadhead_miles", "Miles vs yesterday"),
    summary: [
      { label: "Total miles", value: formatFleetMiles(rows.reduce((s, r) => s + Number(r.deadhead_miles ?? 0), 0)) },
      { label: "Trucks affected", value: String(rows.filter((r) => Number(r.deadhead_miles) > 0).length) },
    ],
    records: rows.map((row) => ({
      id: row.truck_id,
      truck: relOne(row.trucks)?.unit_number ?? "—",
      branch: relOne(row.branches)?.name ?? "—",
      miles: formatFleetMiles(Number(row.deadhead_miles ?? 0)),
      cost: formatFleetCurrency(Number(row.deadhead_cost ?? 0)),
    })),
    columns: [
      { key: "truck", label: "Truck" },
      { key: "branch", label: "Branch" },
      { key: "miles", label: "Miles", align: "right" },
      { key: "cost", label: "Cost", align: "right" },
    ],
    recommendations: mapRecommendations(
      ctx.recommendations.pending.filter((r) => r.recommendation_type === "truck_assignment"),
      ctx.date
    ),
    history: [],
    historyColumns: [],
    impactSummary: {
      timeSaved: ctx.recommendationRoi?.travelTimeSavedMinutes
        ? `${Math.round(ctx.recommendationRoi.travelTimeSavedMinutes)} min saved (week)`
        : undefined,
    },
    actions: [
      { id: "combine", label: "Combine jobs", href: buildDispatchExceptionHref(ctx.date) },
      { id: "reassign", label: "Reassign truck", href: buildDispatchExceptionHref(ctx.date) },
    ],
  };
}

function buildOvertimeRisk(ctx: FleetInsightContext): FleetKpiInsightPayload {
  const meta = getFleetKpiRegistryEntry("overtime-risk");
  const lanes = ctx.board.truckLanes.filter((l) => (l.operator_daily_hours ?? 0) >= 6 || (l.operator_weekly_hours ?? 0) >= 36);
  return {
    kpiId: "overtime-risk",
    title: meta.title,
    description: meta.description,
    lastUpdated: ctx.recommendations.generatedAt,
    primaryValue: formatFleetCurrency(ctx.commandCenter.overtimeCostToday ?? 0),
    primaryLabel: "Estimated OT cost today",
    summary: [
      { label: "Operators flagged", value: String(lanes.length) },
      { label: "Labor cost", value: formatFleetCurrency(ctx.commandCenter.laborCostToday ?? 0) },
    ],
    records: lanes.map((lane) => ({
      id: lane.truck_id,
      operator: lane.operator_name ?? "—",
      truck: lane.unit_number,
      branch: lane.branch_name ?? "—",
      daily_hours: formatFleetHours(lane.operator_daily_hours ?? 0),
      weekly_hours: formatFleetHours(lane.operator_weekly_hours ?? 0),
    })),
    columns: [
      { key: "operator", label: "Operator" },
      { key: "truck", label: "Truck" },
      { key: "daily_hours", label: "Today", align: "right" },
      { key: "weekly_hours", label: "Week", align: "right" },
    ],
    recommendations: mapRecommendations(
      ctx.recommendations.pending.filter((r) => r.recommendation_type === "capacity_overload"),
      ctx.date
    ),
    history: [],
    historyColumns: [],
    impactSummary: { estimatedImpact: formatFleetCurrency(ctx.commandCenter.overtimeCostToday ?? 0) },
    actions: [
      { id: "move-workload", label: "Move workload", href: buildDispatchExceptionHref(ctx.date) },
      { id: "swap-operator", label: "Swap operators", href: "/fleet/operators" },
    ],
  };
}

function buildAcceptanceRate(ctx: FleetInsightContext): FleetKpiInsightPayload {
  const meta = getFleetKpiRegistryEntry("acceptance-rate");
  const { summary } = ctx.recommendations;
  const roi = ctx.recommendationRoi;
  const dismissed = ctx.recommendations.history.filter((h) => h.latest_outcome?.action === "dismissed");
  return {
    kpiId: "acceptance-rate",
    title: meta.title,
    description: meta.description,
    lastUpdated: ctx.recommendations.generatedAt,
    primaryValue: summary.acceptanceRate != null ? formatFleetPercent(summary.acceptanceRate, 0) : "—",
    primaryLabel: "Recommendation acceptance",
    summary: [
      { label: "Pending", value: String(ctx.recommendations.pending.length) },
      { label: "Accepted", value: String(roi?.accepted ?? summary.accepted) },
      { label: "Dismissed", value: String(roi?.dismissed ?? summary.dismissed) },
      { label: "ROI", value: formatFleetCurrency(roi?.contributionImprovement ?? 0) },
    ],
    records: ctx.recommendations.pending.map((rec) => ({
      id: rec.id,
      title: rec.rationale.title,
      score: String(Math.round(rec.score)),
      type: rec.recommendation_type.replace(/_/g, " "),
    })),
    columns: [
      { key: "title", label: "Recommendation" },
      { key: "type", label: "Type" },
      { key: "score", label: "Score", align: "right" },
    ],
    recommendations: mapRecommendations(ctx.recommendations.pending, ctx.date),
    history: dismissed.slice(0, 10).map((entry) => ({
      id: entry.id,
      decision: entry.rationale.title,
      outcome: "dismissed",
      reason: entry.latest_outcome?.notes ?? "No reason recorded",
    })),
    historyColumns: [
      { key: "decision", label: "Decision" },
      { key: "reason", label: "Reason" },
    ],
    impactSummary: {
      revenueProtected: formatFleetCurrency(roi?.revenueProtected ?? 0),
      timeSaved: roi?.travelTimeSavedMinutes ? `${Math.round(roi.travelTimeSavedMinutes)} min` : undefined,
    },
    actions: [
      { id: "review-rejected", label: "Review dismissed", href: fleetOperationsSectionHref("recommendations") },
      { id: "open-dispatch", label: "Open dispatch", href: buildDispatchExceptionHref(ctx.date) },
    ],
  };
}

const BUILDERS: Record<FleetKpiId, (ctx: FleetInsightContext) => FleetKpiInsightPayload> = {
  "active-trucks": buildActiveTrucks,
  "idle-offline": buildIdleOffline,
  "jobs-today": buildJobsToday,
  utilization: buildUtilization,
  "est-contribution": buildEstContribution,
  "deadhead-cost": buildDeadheadCost,
  "overtime-risk": buildOvertimeRisk,
  "acceptance-rate": buildAcceptanceRate,
};

export function buildFleetKpiInsight(kpiId: FleetKpiId, ctx: FleetInsightContext): FleetKpiInsightPayload {
  return BUILDERS[kpiId](ctx);
}

export function buildFleetKpiInsightFromTodayView(
  kpiId: FleetKpiId,
  data: FleetTodayViewData
): FleetKpiInsightPayload {
  return buildFleetKpiInsight(kpiId, {
    date: data.date,
    board: data.board,
    commandCenter: data.commandCenter,
    recommendations: data.recommendations,
    recommendationRoi: data.recommendationRoi,
    changesSinceYesterday: data.changesSinceYesterday,
    martRows: data.martRows,
  });
}
