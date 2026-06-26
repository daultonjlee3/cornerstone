import type { SupabaseClient } from "@supabase/supabase-js";
import { getFleetRecommendations } from "@/src/lib/fleet-recommendation-engine/service";
import type {
  FleetCapacityAlert,
  FleetCommandCenterData,
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetIntegrationHealthItem,
  FleetMetricDelta,
  FleetMetricDeltaDirection,
  FleetOperationalException,
  FleetRecommendationsResponse,
  FleetTodayViewData,
  IntegrationConnection,
} from "@/src/types/fleet";
import { loadFleetCommandCenterData } from "./command-center";
import { loadFleetDispatchBoardData } from "./dispatch-board";
import { loadFleetExecutiveInsights, loadRecommendationRoiSummary } from "@/src/lib/operational-profitability/performance-reports";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayDateOnly(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function deltaDirection(
  delta: number | null,
  higherIsBetter: boolean
): FleetMetricDeltaDirection {
  if (delta == null || !Number.isFinite(delta)) return "unknown";
  if (Math.abs(delta) < 0.01) return "unchanged";
  if (higherIsBetter) return delta > 0 ? "improved" : "declined";
  return delta < 0 ? "improved" : "declined";
}

function buildMetricDelta(
  key: string,
  label: string,
  today: number | null,
  yesterday: number | null,
  format: FleetMetricDelta["format"],
  higherIsBetter: boolean
): FleetMetricDelta {
  const delta =
    today != null && yesterday != null && Number.isFinite(today) && Number.isFinite(yesterday)
      ? today - yesterday
      : null;
  const deltaPercent =
    delta != null && yesterday != null && yesterday !== 0
      ? (delta / yesterday) * 100
      : null;
  return {
    key,
    label,
    today,
    yesterday,
    delta,
    deltaPercent,
    direction: deltaDirection(delta, higherIsBetter),
    format,
  };
}

function integrationHealthStatus(
  connection: IntegrationConnection
): FleetIntegrationHealthItem["status"] {
  if (connection.status === "error") return "error";
  if (connection.status === "disabled" || connection.status === "pending") return "warning";
  if (!connection.last_sync_at) return "warning";
  const ageMs = Date.now() - Date.parse(connection.last_sync_at);
  const pollSec =
    typeof connection.config?.poll_interval_sec === "number"
      ? connection.config.poll_interval_sec
      : 300;
  if (Number.isNaN(ageMs) || ageMs > pollSec * 3 * 1000) return "warning";
  return "healthy";
}

const PROVIDER_LABELS: Record<string, string> = {
  csv_manual: "CSV Import",
  samsara: "Samsara",
  webhook_jobs: "Jobs Webhook",
  webhook_telematics: "Telematics Webhook",
};

function buildIntegrationHealth(
  connections: IntegrationConnection[]
): FleetIntegrationHealthItem[] {
  return connections.map((c) => {
    const status = integrationHealthStatus(c);
    let message: string | null = null;
    if (c.status === "error") message = c.last_error ?? "Connection error";
    else if (status === "warning" && !c.last_sync_at) message = "No sync recorded yet";
    else if (status === "warning") message = "Sync is stale";
    return {
      id: c.id,
      provider: c.provider,
      displayName: c.display_name ?? PROVIDER_LABELS[c.provider] ?? c.provider,
      status,
      lastSyncAt: c.last_sync_at,
      message,
    };
  });
}

function isUrgentJob(job: FleetDispatchJob): boolean {
  return job.priority === "urgent" || job.priority === "high";
}

function buildExceptions(
  board: FleetDispatchBoardData,
  integrationHealth: FleetIntegrationHealthItem[],
  revenueAtRisk: number
): FleetOperationalException[] {
  const exceptions: FleetOperationalException[] = [];
  const now = Date.now();

  for (const job of board.unassignedJobs.filter(isUrgentJob)) {
    exceptions.push({
      id: `unassigned-${job.id}`,
      category: "unassigned_job",
      severity: job.priority === "urgent" ? "critical" : "warning",
      title: `${job.priority === "urgent" ? "Urgent" : "High priority"} job unassigned: ${job.title}`,
      whyItMatters: `$${Math.round(job.revenue_estimate).toLocaleString()} revenue at risk if not dispatched.`,
      recommendedAction: "Assign a truck on the dispatch board or accept a recommendation.",
      href: `/dispatch?date=${board.date}`,
    });
  }

  for (const branch of board.branchCapacity) {
    if (branch.available_truck_hours <= 0) continue;
    const util = branch.utilization;
    if (util > 1) {
      exceptions.push({
        id: `overload-${branch.branch_id}`,
        category: "capacity",
        severity: util >= 1.1 ? "critical" : "warning",
        title: `${branch.branch_name} over capacity (${Math.round(util * 100)}%)`,
        whyItMatters: `${branch.committed_hours.toFixed(1)}h committed vs ${branch.available_truck_hours.toFixed(1)}h available — jobs may slip.`,
        recommendedAction: "Rebalance work across branches or defer lower-priority jobs.",
        href: `/dispatch?date=${board.date}`,
      });
    }
  }

  for (const lane of board.truckLanes) {
    if (lane.status !== "active") continue;
    if (lane.telematics_status === "offline") {
      exceptions.push({
        id: `offline-${lane.truck_id}`,
        category: "telematics",
        severity: "warning",
        title: `Truck ${lane.unit_number} offline — no live GPS`,
        whyItMatters: "Dispatch recommendations may use stale location data.",
        recommendedAction: "Verify telematics device and integration sync.",
        href: "/settings/integrations",
      });
    } else if (lane.telematics_status === "stale") {
      exceptions.push({
        id: `stale-${lane.truck_id}`,
        category: "telematics",
        severity: "info",
        title: `Truck ${lane.unit_number} GPS stale`,
        whyItMatters: "Last position may not reflect current location.",
        recommendedAction: "Check telematics feed or confirm truck status with operator.",
        href: "/settings/integrations",
      });
    }

    if (
      lane.utilization <= 0.2 &&
      lane.committed_hours <= 0.5 &&
      board.unassignedJobs.length > 0
    ) {
      exceptions.push({
        id: `idle-${lane.truck_id}`,
        category: "idle_truck",
        severity: "info",
        title: `Truck ${lane.unit_number} underutilized today`,
        whyItMatters: "Unused capacity while jobs remain in queue.",
        recommendedAction: "Assign pending jobs or review branch workload.",
        href: `/dispatch?date=${board.date}`,
      });
    }

    if (!lane.latitude || !lane.longitude) {
      exceptions.push({
        id: `nogps-truck-${lane.truck_id}`,
        category: "gps",
        severity: "info",
        title: `Truck ${lane.unit_number} missing map coordinates`,
        whyItMatters: "Deadhead estimates may default to conservative assumptions.",
        recommendedAction: "Set home depot or branch coordinates.",
        href: "/fleet/trucks",
      });
    }
  }

  for (const job of board.jobs.filter((j) => !j.site_latitude || !j.site_longitude).slice(0, 3)) {
    exceptions.push({
      id: `nogps-job-${job.id}`,
      category: "gps",
      severity: "info",
      title: `Job "${job.title}" missing site coordinates`,
      whyItMatters: "Cannot optimize travel or show job on map.",
      recommendedAction: "Geocode customer site.",
      href: "/fleet/sites",
    });
  }

  for (const job of board.jobs) {
    const start = job.scheduled_start ? Date.parse(job.scheduled_start) : NaN;
    if (
      Number.isFinite(start) &&
      start < now &&
      (job.status === "scheduled" || job.status === "in_progress")
    ) {
      exceptions.push({
        id: `late-${job.id}`,
        category: "dispatch",
        severity: job.status === "in_progress" ? "warning" : "critical",
        title: `Late job: ${job.title}`,
        whyItMatters: "Scheduled start has passed — customer SLA may be at risk.",
        recommendedAction: "Update schedule or mark in progress on dispatch board.",
        href: `/dispatch?date=${board.date}`,
      });
    }

    if (
      job.scheduled_start &&
      !job.assigned_truck_id &&
      job.status !== "unassigned" &&
      job.status !== "cancelled"
    ) {
      exceptions.push({
        id: `incomplete-${job.id}`,
        category: "dispatch",
        severity: "warning",
        title: `Incomplete dispatch: ${job.title}`,
        whyItMatters: "Job is scheduled but no truck is assigned.",
        recommendedAction: "Assign truck before start time.",
        href: `/dispatch?date=${board.date}`,
      });
    }
  }

  if (revenueAtRisk > 0 && board.unassignedJobs.length > 0) {
    exceptions.push({
      id: "revenue-at-risk",
      category: "revenue",
      severity: board.unassignedJobs.some((j) => j.priority === "urgent") ? "critical" : "warning",
      title: `$${Math.round(revenueAtRisk).toLocaleString()} revenue at risk from unassigned jobs`,
      whyItMatters: `${board.unassignedJobs.length} job(s) without truck assignment.`,
      recommendedAction: "Review recommendations and dispatch queue.",
      href: "/operations?focus=recommendations",
    });
  }

  for (const conn of integrationHealth.filter((c) => c.status !== "healthy")) {
    exceptions.push({
      id: `integration-${conn.id}`,
      category: "integration",
      severity: conn.status === "error" ? "critical" : "warning",
      title: `Integration issue: ${conn.displayName}`,
      whyItMatters: conn.message ?? "Data feed may be stale or disconnected.",
      recommendedAction: "Open integrations and verify connection health.",
      href: "/settings/integrations",
    });
  }

  const severityOrder: Record<FleetOperationalException["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return exceptions.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.title.localeCompare(b.title)
  );
}

function buildCapacityAlerts(board: FleetDispatchBoardData): {
  upcoming: FleetCapacityAlert[];
  unused: FleetCapacityAlert[];
} {
  const upcoming: FleetCapacityAlert[] = [];
  const unused: FleetCapacityAlert[] = [];
  for (const branch of board.branchCapacity) {
    if (branch.available_truck_hours <= 0) continue;
    const alert: FleetCapacityAlert = {
      branch_id: branch.branch_id,
      branch_name: branch.branch_name,
      utilization: branch.utilization,
      committed_hours: branch.committed_hours,
      available_truck_hours: branch.available_truck_hours,
      href: `/dispatch?date=${board.date}`,
    };
    if (branch.utilization >= 0.8) upcoming.push(alert);
    if (branch.utilization < 0.65) unused.push(alert);
  }
  upcoming.sort((a, b) => b.utilization - a.utilization);
  unused.sort((a, b) => a.utilization - b.utilization);
  return { upcoming, unused };
}

function buildExecutiveSummary(input: {
  exceptions: FleetOperationalException[];
  changes: FleetMetricDelta[];
  recommendations: number;
  revenueAtRisk: number;
  unusedBranches: FleetCapacityAlert[];
  overloadBranches: FleetCapacityAlert[];
}): string {
  const parts: string[] = [];

  const urgentUnassigned = input.exceptions.filter(
    (e) => e.category === "unassigned_job" && e.severity === "critical"
  ).length;
  if (urgentUnassigned > 0) {
    parts.push(
      `${urgentUnassigned} urgent job${urgentUnassigned === 1 ? "" : "s"} remain unassigned`
    );
  } else if (input.exceptions.some((e) => e.category === "unassigned_job")) {
    const count = input.exceptions.filter((e) => e.category === "unassigned_job").length;
    parts.push(`${count} high-priority job${count === 1 ? "" : "s"} need assignment`);
  }

  if (input.overloadBranches.length > 0 && input.unusedBranches.length > 0) {
    const over = input.overloadBranches[0];
    const under = input.unusedBranches[0];
    parts.push(
      `${over.branch_name} is at ${Math.round(over.utilization * 100)}% capacity while ${under.branch_name} has ${Math.round((1 - under.utilization) * 100)}% unused capacity`
    );
  } else if (input.overloadBranches.length > 0) {
    const over = input.overloadBranches[0];
    parts.push(`${over.branch_name} is operating at ${Math.round(over.utilization * 100)}% capacity`);
  }

  const offline = input.exceptions.filter((e) => e.category === "telematics" && e.title.includes("offline")).length;
  const stale = input.exceptions.filter((e) => e.category === "telematics" && e.title.includes("stale")).length;
  if (offline > 0) {
    parts.push(`${offline} truck${offline === 1 ? "" : "s"} ${offline === 1 ? "has" : "have"} offline GPS`);
  } else if (stale > 0) {
    parts.push(`${stale} truck${stale === 1 ? "" : "s"} with stale GPS data`);
  }

  const utilChange = input.changes.find((c) => c.key === "utilization");
  if (utilChange?.deltaPercent != null && Math.abs(utilChange.deltaPercent) >= 0.5) {
    const dir = utilChange.deltaPercent > 0 ? "increased" : "decreased";
    parts.push(`Billable utilization ${dir} ${Math.abs(utilChange.deltaPercent).toFixed(1)}% since yesterday`);
  }

  const revChange = input.changes.find((c) => c.key === "revenue_per_truck");
  if (revChange?.deltaPercent != null && Math.abs(revChange.deltaPercent) >= 0.5) {
    const dir = revChange.deltaPercent > 0 ? "increased" : "decreased";
    parts.push(`Revenue per truck ${dir} ${Math.abs(revChange.deltaPercent).toFixed(1)}% since yesterday`);
  }

  if (input.recommendations > 0) {
    parts.push(`${input.recommendations} recommendation${input.recommendations === 1 ? "" : "s"} awaiting action`);
  }

  if (input.revenueAtRisk > 0 && !parts.some((p) => p.includes("revenue"))) {
    parts.push(`$${Math.round(input.revenueAtRisk).toLocaleString()} in unassigned job revenue at risk`);
  }

  const integrationIssues = input.exceptions.filter((e) => e.category === "integration").length;
  if (integrationIssues > 0) {
    parts.push(`${integrationIssues} data connection${integrationIssues === 1 ? "" : "s"} need attention`);
  }

  if (parts.length === 0) {
    return "Operations are stable. No critical exceptions detected — review recommendations and dispatch board to optimize today's plan.";
  }

  return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}${parts.length > 1 ? `. ${parts.slice(1).join(". ")}.` : "."}`;
}

async function loadDayOverDayMetrics(
  supabase: SupabaseClient,
  tenantId: string,
  today: string,
  yesterday: string,
  commandCenter: FleetCommandCenterData,
  board: FleetDispatchBoardData,
  pendingRecommendations: number,
  yesterdayPendingEstimate: number
): Promise<FleetMetricDelta[]> {
  const { data: martRows } = await supabase
    .from("utilization_daily")
    .select("date, billable_hours, total_hours, idle_hours, revenue, deadhead_miles, contribution, truck_id")
    .eq("tenant_id", tenantId)
    .in("date", [today, yesterday]);

  const byDate = new Map<string, typeof martRows>();
  for (const row of martRows ?? []) {
    const d = (row as { date: string }).date;
    const list = byDate.get(d) ?? [];
    list.push(row);
    byDate.set(d, list);
  }

  function aggregate(date: string) {
    const rows = byDate.get(date) ?? [];
    const billable = rows.reduce((s, r) => s + Number((r as { billable_hours: number }).billable_hours), 0);
    const total = rows.reduce((s, r) => s + Number((r as { total_hours: number }).total_hours), 0);
    const idle = rows.reduce((s, r) => s + Number((r as { idle_hours: number }).idle_hours), 0);
    const revenue = rows.reduce((s, r) => s + Number((r as { revenue: number }).revenue), 0);
    const contribution = rows.reduce((s, r) => s + Number((r as { contribution: number }).contribution), 0);
    const deadhead = rows.reduce((s, r) => s + Number((r as { deadhead_miles: number }).deadhead_miles), 0);
    const truckIds = new Set(rows.map((r) => (r as { truck_id: string }).truck_id));
    const utilization = total > 0 ? (billable / total) * 100 : null;
    const revenuePerTruck = truckIds.size > 0 ? revenue / truckIds.size : null;
    return { utilization, revenuePerTruck, idle, deadhead, contribution };
  }

  const todayAgg = aggregate(today);
  const yesterdayAgg = aggregate(yesterday);

  const utilToday = commandCenter.utilizationPercent ?? todayAgg.utilization;
  const utilYesterday = yesterdayAgg.utilization;

  return [
    buildMetricDelta("utilization", "Billable utilization", utilToday, utilYesterday, "percent", true),
    buildMetricDelta(
      "contribution",
      "Contribution (daily)",
      todayAgg.contribution,
      yesterdayAgg.contribution,
      "currency",
      true
    ),
    buildMetricDelta(
      "revenue_per_truck",
      "Revenue per truck (daily)",
      todayAgg.revenuePerTruck,
      yesterdayAgg.revenuePerTruck,
      "currency",
      true
    ),
    buildMetricDelta("idle_hours", "Idle hours", todayAgg.idle, yesterdayAgg.idle, "hours", false),
    buildMetricDelta("deadhead", "Deadhead miles (est.)", todayAgg.deadhead, yesterdayAgg.deadhead, "miles", false),
    buildMetricDelta(
      "unassigned_jobs",
      "Unassigned jobs",
      board.unassignedJobs.length,
      null,
      "count",
      false
    ),
    buildMetricDelta(
      "recommendations",
      "Pending recommendations",
      pendingRecommendations,
      yesterdayPendingEstimate,
      "count",
      false
    ),
  ];
}

export type LoadFleetTodayViewOptions = {
  /** Board date for metrics (defaults to UTC today) */
  date?: string;
  /** Preloaded dispatch board — avoids duplicate query on /dispatch */
  board?: FleetDispatchBoardData;
  /** Preloaded recommendations — avoids duplicate generation on /dispatch */
  recommendations?: FleetRecommendationsResponse;
};

export async function loadFleetTodayViewData(
  supabase: SupabaseClient,
  tenantId: string,
  options?: LoadFleetTodayViewOptions
): Promise<FleetTodayViewData> {
  const date = options?.date ?? todayDateOnly();
  const yesterday = yesterdayDateOnly();

  const weekStart = new Date(`${date}T12:00:00.000Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const boardPromise = options?.board
    ? Promise.resolve(options.board)
    : loadFleetDispatchBoardData(supabase, tenantId, date);

  const recommendationsPromise = options?.recommendations
    ? Promise.resolve(options.recommendations)
    : getFleetRecommendations(supabase, tenantId, { date });

  const [commandCenter, board, recommendations, connectionsResult, executiveInsights, recommendationRoi] =
    await Promise.all([
    loadFleetCommandCenterData(supabase, tenantId),
    boardPromise,
    recommendationsPromise,
    supabase
      .from("integration_connections")
      .select("id, provider, display_name, status, config, last_sync_at, last_error")
      .eq("tenant_id", tenantId),
    loadFleetExecutiveInsights(supabase, tenantId, date),
    loadRecommendationRoiSummary(supabase, tenantId, weekStartStr, date),
  ]);

  const connections = (connectionsResult.data ?? []) as IntegrationConnection[];
  const integrationHealth = buildIntegrationHealth(connections);

  const revenueAtRisk = board.unassignedJobs.reduce((sum, j) => sum + (j.revenue_estimate || 0), 0);
  const exceptions = buildExceptions(board, integrationHealth, revenueAtRisk);
  const { upcoming, unused } = buildCapacityAlerts(board);

  const changesSinceYesterday = await loadDayOverDayMetrics(
    supabase,
    tenantId,
    date,
    yesterday,
    commandCenter,
    board,
    recommendations.pending.length,
    0
  );

  const overloadBranches = board.branchCapacity.filter(
    (b) => b.available_truck_hours > 0 && b.utilization > 1
  );

  const executiveSummary = buildExecutiveSummary({
    exceptions,
    changes: changesSinceYesterday,
    recommendations: recommendations.pending.length,
    revenueAtRisk,
    unusedBranches: unused,
    overloadBranches: overloadBranches.map((b) => ({
      branch_id: b.branch_id,
      branch_name: b.branch_name,
      utilization: b.utilization,
      committed_hours: b.committed_hours,
      available_truck_hours: b.available_truck_hours,
      href: `/dispatch?date=${date}`,
    })),
  });

  return {
    date,
    executiveSummary,
    commandCenter,
    executiveInsights,
    exceptions,
    changesSinceYesterday,
    integrationHealth,
    upcomingCapacityIssues: upcoming,
    unusedCapacityBranches: unused,
    recommendations,
    recommendationRoi,
    revenueAtRisk,
    pendingActionCount: recommendations.pending.length + exceptions.filter((e) => e.severity === "critical").length,
  };
}
