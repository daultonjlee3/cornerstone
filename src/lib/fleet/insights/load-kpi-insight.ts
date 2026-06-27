import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetCommandCenterData, FleetDispatchBoardData, FleetMetricDelta, FleetUtilizationMartRow } from "@/src/types/fleet";
import { getFleetRecommendations } from "@/src/lib/fleet-recommendation-engine/service";
import { loadFleetCommandCenterData } from "@/src/lib/fleet/queries/command-center";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import { loadRecommendationRoiSummary } from "@/src/lib/operational-profitability/performance-reports";
import { buildFleetKpiInsight, type FleetInsightContext } from "./build-kpi-insights";
import type { FleetKpiId, FleetKpiInsightPayload } from "./types";

function yesterdayDateOnly(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function loadInsightChanges(
  supabase: SupabaseClient,
  tenantId: string,
  date: string,
  commandCenter: FleetCommandCenterData
): Promise<FleetMetricDelta[]> {
  const yesterday = yesterdayDateOnly();
  const { data: martRows } = await supabase
    .from("utilization_daily")
    .select("date, billable_hours, total_hours, contribution, deadhead_miles")
    .eq("tenant_id", tenantId)
    .in("date", [date, yesterday]);

  const byDate = new Map<string, NonNullable<typeof martRows>>();
  for (const row of martRows ?? []) {
    const d = (row as { date: string }).date;
    const list = byDate.get(d) ?? [];
    list.push(row);
    byDate.set(d, list);
  }

  function aggregate(d: string) {
    const rows = byDate.get(d) ?? [];
    const billable = rows.reduce((s, r) => s + Number((r as { billable_hours: number }).billable_hours), 0);
    const total = rows.reduce((s, r) => s + Number((r as { total_hours: number }).total_hours), 0);
    const contribution = rows.reduce((s, r) => s + Number((r as { contribution: number }).contribution), 0);
    const deadhead = rows.reduce((s, r) => s + Number((r as { deadhead_miles: number }).deadhead_miles), 0);
    return { utilization: total > 0 ? (billable / total) * 100 : null, contribution, deadhead };
  }

  const todayAgg = aggregate(date);
  const yesterdayAgg = aggregate(yesterday);
  const deltaDir = (delta: number | null, higherIsBetter: boolean) => {
    if (delta == null || !Number.isFinite(delta)) return "unknown" as const;
    if (Math.abs(delta) < 0.01) return "unchanged" as const;
    if (higherIsBetter) return delta > 0 ? ("improved" as const) : ("declined" as const);
    return delta < 0 ? ("improved" as const) : ("declined" as const);
  };

  return [
    {
      key: "utilization",
      label: "Utilization",
      today: todayAgg.utilization,
      yesterday: yesterdayAgg.utilization,
      delta:
        todayAgg.utilization != null && yesterdayAgg.utilization != null
          ? todayAgg.utilization - yesterdayAgg.utilization
          : null,
      deltaPercent: null,
      direction: deltaDir(
        todayAgg.utilization != null && yesterdayAgg.utilization != null
          ? todayAgg.utilization - yesterdayAgg.utilization
          : null,
        true
      ),
      format: "percent",
    },
    {
      key: "contribution",
      label: "Contribution",
      today: todayAgg.contribution,
      yesterday: yesterdayAgg.contribution,
      delta: todayAgg.contribution - yesterdayAgg.contribution,
      deltaPercent: null,
      direction: deltaDir(todayAgg.contribution - yesterdayAgg.contribution, true),
      format: "currency",
    },
    {
      key: "deadhead_miles",
      label: "Deadhead miles",
      today: todayAgg.deadhead,
      yesterday: yesterdayAgg.deadhead,
      delta: todayAgg.deadhead - yesterdayAgg.deadhead,
      deltaPercent: null,
      direction: deltaDir(todayAgg.deadhead - yesterdayAgg.deadhead, false),
      format: "miles",
    },
    {
      key: "active_trucks",
      label: "Active trucks",
      today: commandCenter.activeTrucks,
      yesterday: null,
      delta: null,
      deltaPercent: null,
      direction: "unknown",
      format: "count",
    },
  ];
}

export async function loadFleetKpiInsight(
  supabase: SupabaseClient,
  tenantId: string,
  kpiId: FleetKpiId,
  date?: string
): Promise<FleetKpiInsightPayload> {
  const boardDate = date ?? new Date().toISOString().slice(0, 10);
  const weekStart = new Date(`${boardDate}T12:00:00.000Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

  const board = await loadFleetDispatchBoardData(supabase, tenantId, boardDate);
  const skipHistory = kpiId !== "acceptance-rate";

  const [commandCenter, recommendations, recommendationRoi, martResult] = await Promise.all([
    loadFleetCommandCenterData(supabase, tenantId),
    getFleetRecommendations(supabase, tenantId, {
      date: boardDate,
      board,
      skipHistory,
      deferGeneration: true,
    }),
    loadRecommendationRoiSummary(supabase, tenantId, weekStart.toISOString().slice(0, 10), boardDate),
    supabase
      .from("utilization_daily")
      .select(
        "truck_id, branch_id, deadhead_miles, deadhead_cost, contribution, billable_hours, total_hours, overtime_cost, trucks(unit_number), branches(name)"
      )
      .eq("tenant_id", tenantId)
      .eq("date", boardDate),
  ]);

  if (martResult.error) throw new Error(martResult.error.message);

  const changesSinceYesterday = await loadInsightChanges(supabase, tenantId, boardDate, commandCenter);

  const ctx: FleetInsightContext = {
    date: boardDate,
    board: board as FleetDispatchBoardData,
    commandCenter,
    recommendations,
    recommendationRoi,
    changesSinceYesterday,
    martRows: (martResult.data ?? []) as FleetUtilizationMartRow[],
  };

  return buildFleetKpiInsight(kpiId, ctx);
}
