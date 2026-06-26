/**
 * Approved read-only query tools for Fleet Intelligence Copilot.
 * No arbitrary SQL — each function is tenant-scoped and returns structured JSON.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadFleetCommandCenterData } from "@/src/lib/fleet/queries/command-center";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import { loadFleetTodayViewData } from "@/src/lib/fleet/queries/today-view";
import { loadFleetPerformanceDashboard } from "@/src/lib/operational-profitability/performance-reports";
import { getFleetRecommendations } from "@/src/lib/fleet-recommendation-engine/service";
import { listSyncRuns } from "@/src/lib/integrations/sync-runs";
import type {
  FleetBranchPerformanceRow,
  FleetDispatchBoardData,
  FleetDispatchTruckLane,
  FleetIntegrationHealthItem,
  FleetOperationalException,
  FleetRecommendationInstance,
  IntegrationConnection,
} from "@/src/types/fleet";
import type { CopilotQueryResult } from "./types";
import { snapshotFromRecommendation } from "../fleet-copilot-utils";

function meta(source: string, extra?: Partial<CopilotQueryResult<unknown>["meta"]>): CopilotQueryResult<unknown>["meta"] {
  return { source, retrievedAt: new Date().toISOString(), ...extra };
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultPerformanceRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 13);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function integrationHealthStatus(connection: IntegrationConnection): FleetIntegrationHealthItem["status"] {
  if (connection.status === "error") return "error";
  if (connection.status === "disabled" || connection.status === "pending") return "warning";
  if (!connection.last_sync_at) return "warning";
  const ageMs = Date.now() - Date.parse(connection.last_sync_at);
  const pollSec =
    typeof connection.config?.poll_interval_sec === "number" ? connection.config.poll_interval_sec : 300;
  if (Number.isNaN(ageMs) || ageMs > pollSec * 3 * 1000) return "warning";
  return "healthy";
}

const PROVIDER_LABELS: Record<string, string> = {
  csv_manual: "CSV Import",
  samsara: "Samsara",
  webhook_jobs: "Jobs Webhook",
  webhook_telematics: "Telematics Webhook",
};

export type FleetQueryScope = {
  tenantId: string;
  branchId?: string | null;
  date?: string;
  dateRange?: { from: string; to: string };
};

export async function getBranchPerformanceSummary(
  supabase: SupabaseClient,
  scope: FleetQueryScope
): Promise<CopilotQueryResult<FleetBranchPerformanceRow[]>> {
  const range = scope.dateRange ?? defaultPerformanceRange();
  try {
    const dashboard = await loadFleetPerformanceDashboard(supabase, scope.tenantId, {
      from: range.from,
      to: range.to,
      branchId: scope.branchId,
    });
    return {
      data: dashboard.branches,
      meta: meta("Fleet Performance — branch contribution", { dateRange: range, branchId: scope.branchId }),
    };
  } catch {
    return {
      data: null,
      meta: meta("Fleet Performance — branch contribution"),
      missingData: ["branch_performance_mart"],
    };
  }
}

export async function getTruckPerformanceSummary(
  supabase: SupabaseClient,
  scope: FleetQueryScope
): Promise<CopilotQueryResult<Awaited<ReturnType<typeof loadFleetPerformanceDashboard>>["trucks"]>> {
  const range = scope.dateRange ?? defaultPerformanceRange();
  try {
    const dashboard = await loadFleetPerformanceDashboard(supabase, scope.tenantId, {
      from: range.from,
      to: range.to,
      branchId: scope.branchId,
    });
    return {
      data: dashboard.trucks,
      meta: meta("Fleet Performance — truck contribution", { dateRange: range, branchId: scope.branchId }),
    };
  } catch {
    return {
      data: null,
      meta: meta("Fleet Performance — truck contribution"),
      missingData: ["truck_performance_mart"],
    };
  }
}

export async function getOperatorPerformanceSummary(
  supabase: SupabaseClient,
  scope: FleetQueryScope
): Promise<CopilotQueryResult<Awaited<ReturnType<typeof loadFleetPerformanceDashboard>>["operators"]>> {
  const range = scope.dateRange ?? defaultPerformanceRange();
  try {
    const dashboard = await loadFleetPerformanceDashboard(supabase, scope.tenantId, {
      from: range.from,
      to: range.to,
      branchId: scope.branchId,
    });
    return {
      data: dashboard.operators,
      meta: meta("Fleet Performance — operator contribution", { dateRange: range, branchId: scope.branchId }),
    };
  } catch {
    return {
      data: null,
      meta: meta("Fleet Performance — operator contribution"),
      missingData: ["operator_performance_mart"],
    };
  }
}

export async function getContributionTrend(
  supabase: SupabaseClient,
  scope: FleetQueryScope
): Promise<CopilotQueryResult<Awaited<ReturnType<typeof loadFleetPerformanceDashboard>>["contributionTrend"]>> {
  const range = scope.dateRange ?? defaultPerformanceRange();
  try {
    const dashboard = await loadFleetPerformanceDashboard(supabase, scope.tenantId, {
      from: range.from,
      to: range.to,
      branchId: scope.branchId,
    });
    return {
      data: dashboard.contributionTrend,
      meta: meta("Fleet Performance — contribution trend", { dateRange: range }),
    };
  } catch {
    return {
      data: null,
      meta: meta("Fleet Performance — contribution trend"),
      missingData: ["contribution_trend_mart"],
    };
  }
}

export async function getOpenRecommendations(
  supabase: SupabaseClient,
  scope: FleetQueryScope
): Promise<CopilotQueryResult<FleetRecommendationInstance[]>> {
  const date = scope.date ?? todayDateOnly();
  try {
    const res = await getFleetRecommendations(supabase, scope.tenantId, {
      date,
      branchId: scope.branchId ?? null,
    });
    return {
      data: res.pending ?? [],
      meta: meta("Recommendation engine — pending recommendations", { dateRange: { from: date, to: date } }),
    };
  } catch {
    return {
      data: null,
      meta: meta("Recommendation engine — pending recommendations"),
      missingData: ["recommendations"],
    };
  }
}

export async function getRecommendationById(
  supabase: SupabaseClient,
  tenantId: string,
  recommendationId: string
): Promise<CopilotQueryResult<FleetRecommendationInstance>> {
  const { data, error } = await supabase
    .from("recommendation_instances")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", recommendationId)
    .maybeSingle();

  if (error || !data) {
    return {
      data: null,
      meta: meta("Recommendation engine — recommendation detail"),
      missingData: ["recommendation_not_found"],
    };
  }

  return {
    data: data as FleetRecommendationInstance,
    meta: meta("Recommendation engine — recommendation detail"),
  };
}

export async function getRecommendationAlternatives(
  rec: FleetRecommendationInstance
): Promise<CopilotQueryResult<Array<{ unit_number: string; score: number; reasons: string[] }>>> {
  const candidates = rec.rationale.candidates ?? [];
  const snapshots = rec.rationale.candidate_snapshots ?? [];
  const alts = candidates.slice(1, 4).map((c, i) => {
    const snap = snapshots.find((s) => s.truck_id === c.truck_id);
    return {
      unit_number: c.unit_number,
      score: c.score,
      reasons: snap
        ? [
            snap.deadhead_miles != null ? `Deadhead ${snap.deadhead_miles.toFixed(1)} mi` : "",
            snap.telematics_status ? `Telematics ${snap.telematics_status}` : "",
            snap.branch_capacity_label ? `Capacity ${snap.branch_capacity_label}` : "",
          ].filter(Boolean)
        : [],
    };
  });

  return {
    data: alts,
    meta: meta("Recommendation engine — alternatives"),
  };
}

export async function getFleetStatusSummary(
  supabase: SupabaseClient,
  tenantId: string
): Promise<CopilotQueryResult<Awaited<ReturnType<typeof loadFleetCommandCenterData>>>> {
  try {
    const data = await loadFleetCommandCenterData(supabase, tenantId);
    return { data, meta: meta("Command Center — fleet status KPIs") };
  } catch {
    return {
      data: null,
      meta: meta("Command Center — fleet status KPIs"),
      missingData: ["command_center"],
    };
  }
}

function unavailableFromLanes(lanes: FleetDispatchTruckLane[]) {
  return lanes.filter(
    (l) =>
      l.status !== "active" ||
      l.telematics_status === "offline" ||
      Boolean(l.maintenance_note)
  );
}

export async function getUnavailableTrucks(
  supabase: SupabaseClient,
  scope: FleetQueryScope
): Promise<CopilotQueryResult<Array<{ unit_number: string; reason: string; branch_name: string | null }>>> {
  const date = scope.date ?? todayDateOnly();
  try {
    const board = await loadFleetDispatchBoardData(
      supabase,
      scope.tenantId,
      date,
      scope.branchId
    );
    const unavailable = unavailableFromLanes(board.truckLanes).map((l) => ({
      unit_number: l.unit_number,
      branch_name: l.branch_name ?? null,
      reason:
        l.status !== "active"
          ? `Status: ${l.status}`
          : l.telematics_status === "offline"
            ? "GPS offline"
            : l.maintenance_note
              ? "Maintenance note"
              : "Unavailable",
    }));
    return {
      data: unavailable,
      meta: meta("Dispatch board — truck availability", { dateRange: { from: date, to: date } }),
    };
  } catch {
    return {
      data: null,
      meta: meta("Dispatch board — truck availability"),
      missingData: ["dispatch_board"],
    };
  }
}

export async function getUnassignedJobs(
  supabase: SupabaseClient,
  scope: FleetQueryScope
): Promise<CopilotQueryResult<FleetDispatchBoardData["unassignedJobs"]>> {
  const date = scope.date ?? todayDateOnly();
  try {
    const board = await loadFleetDispatchBoardData(
      supabase,
      scope.tenantId,
      date,
      scope.branchId
    );
    return {
      data: board.unassignedJobs,
      meta: meta("Dispatch board — unassigned jobs", { dateRange: { from: date, to: date } }),
    };
  } catch {
    return {
      data: null,
      meta: meta("Dispatch board — unassigned jobs"),
      missingData: ["dispatch_board"],
    };
  }
}

export async function getRevenueAtRisk(
  supabase: SupabaseClient,
  scope: FleetQueryScope
): Promise<
  CopilotQueryResult<{
    revenueAtRisk: number;
    contributionAtRisk: number;
    unassignedJobCount: number;
    topJobs: Array<{ title: string; priority: string; revenue: number }>;
  }>
> {
  const date = scope.date ?? todayDateOnly();
  try {
    const [cc, unassigned] = await Promise.all([
      loadFleetCommandCenterData(supabase, scope.tenantId),
      getUnassignedJobs(supabase, scope),
    ]);
    const jobs = unassigned.data ?? [];
    const topJobs = [...jobs]
      .sort((a, b) => b.revenue_estimate - a.revenue_estimate)
      .slice(0, 5)
      .map((j) => ({
        title: j.title,
        priority: j.priority,
        revenue: j.revenue_estimate,
      }));
    return {
      data: {
        revenueAtRisk: cc.revenueAtRisk ?? 0,
        contributionAtRisk: cc.contributionAtRisk ?? 0,
        unassignedJobCount: cc.unassignedJobs,
        topJobs,
      },
      meta: meta("Command Center + dispatch — revenue at risk"),
    };
  } catch {
    return {
      data: null,
      meta: meta("Command Center — revenue at risk"),
      missingData: ["revenue_at_risk"],
    };
  }
}

export async function getIntegrationHealth(
  supabase: SupabaseClient,
  tenantId: string
): Promise<CopilotQueryResult<FleetIntegrationHealthItem[]>> {
  try {
    const { data, error } = await supabase
      .from("integration_connections")
      .select("id, provider, display_name, status, config, last_sync_at, last_error")
      .eq("tenant_id", tenantId);

    if (error) throw error;

    const connections = (data ?? []) as IntegrationConnection[];
    const health: FleetIntegrationHealthItem[] = connections.map((c) => {
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

    return { data: health, meta: meta("Integration connections — health") };
  } catch {
    return {
      data: null,
      meta: meta("Integration connections — health"),
      missingData: ["integration_connections"],
    };
  }
}

export async function getSyncHistory(
  supabase: SupabaseClient,
  tenantId: string,
  connectionId?: string
): Promise<CopilotQueryResult<Awaited<ReturnType<typeof listSyncRuns>>>> {
  try {
    const runs = await listSyncRuns(supabase, tenantId, { connectionId, limit: 10 });
    return { data: runs, meta: meta("Integration sync history") };
  } catch {
    return {
      data: null,
      meta: meta("Integration sync history"),
      missingData: ["sync_history"],
    };
  }
}

export async function getOperationalExceptions(
  supabase: SupabaseClient,
  scope: FleetQueryScope
): Promise<CopilotQueryResult<FleetOperationalException[]>> {
  const date = scope.date ?? todayDateOnly();
  try {
    const tv = await loadFleetTodayViewData(supabase, scope.tenantId, { date });
    return {
      data: tv.exceptions,
      meta: meta("Command Center — operational exceptions"),
    };
  } catch {
    return {
      data: null,
      meta: meta("Command Center — operational exceptions"),
      missingData: ["operational_exceptions"],
    };
  }
}

export async function getDispatchReadiness(
  supabase: SupabaseClient,
  scope: FleetQueryScope
): Promise<
  CopilotQueryResult<{
    ready: boolean;
    blockers: string[];
    integrationIssues: number;
    unassignedUrgent: number;
    expiredRecommendations: number;
  }>
> {
  const date = scope.date ?? todayDateOnly();
  try {
    const [exceptions, integrations, recs] = await Promise.all([
      getOperationalExceptions(supabase, scope),
      getIntegrationHealth(supabase, scope.tenantId),
      getOpenRecommendations(supabase, scope),
    ]);

    const ex = exceptions.data ?? [];
    const intIssues = (integrations.data ?? []).filter((i) => i.status !== "healthy").length;
    const unassignedUrgent = ex.filter(
      (e) => e.category === "unassigned_job" && (e.severity === "critical" || e.severity === "warning")
    ).length;
    const expired = (recs.data ?? []).filter((r) => Date.parse(r.expires_at) < Date.now()).length;

    const blockers: string[] = [];
    if (intIssues > 0) blockers.push(`${intIssues} integration(s) need attention`);
    if (unassignedUrgent > 0) blockers.push(`${unassignedUrgent} urgent unassigned job(s)`);
    if (expired > 0) blockers.push(`${expired} expired recommendation(s)`);
    const critical = ex.filter((e) => e.severity === "critical");
    for (const c of critical.slice(0, 3)) {
      if (!blockers.some((b) => b.includes(c.title.slice(0, 20)))) {
        blockers.push(c.title);
      }
    }

    return {
      data: {
        ready: blockers.length === 0,
        blockers,
        integrationIssues: intIssues,
        unassignedUrgent,
        expiredRecommendations: expired,
      },
      meta: meta("Dispatch readiness check"),
    };
  } catch {
    return {
      data: null,
      meta: meta("Dispatch readiness check"),
      missingData: ["dispatch_readiness"],
    };
  }
}

export async function getSelectedEntityContext(
  supabase: SupabaseClient,
  scope: FleetQueryScope,
  selectedRecommendationId?: string | null
): Promise<CopilotQueryResult<ReturnType<typeof snapshotFromRecommendation>>> {
  if (!selectedRecommendationId) {
    return {
      data: null,
      meta: meta("Page context — selected recommendation"),
      missingData: ["no_selection_on_screen"],
    };
  }
  const rec = await getRecommendationById(supabase, scope.tenantId, selectedRecommendationId);
  if (!rec.data) {
    return {
      data: null,
      meta: meta("Page context — selected recommendation"),
      missingData: ["selected_recommendation_not_found"],
    };
  }
  return {
    data: snapshotFromRecommendation(rec.data),
    meta: meta("Page context — selected recommendation"),
  };
}
