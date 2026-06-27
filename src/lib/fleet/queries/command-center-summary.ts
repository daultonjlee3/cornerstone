import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetCommandCenterData } from "@/src/types/fleet";
import { computeTelematicsStatus } from "@/src/lib/fleet/queries";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fast KPI aggregates for /operations first paint — no MTD mart or profitability engine. */
export async function loadFleetCommandCenterSummary(
  supabase: SupabaseClient,
  tenantId: string,
  date?: string
): Promise<FleetCommandCenterData> {
  const today = date ?? todayDateOnly();
  const dayStart = `${today}T00:00:00.000Z`;
  const dayEnd = `${today}T23:59:59.999Z`;

  const [trucksResult, jobsTodayResult, unassignedCountResult, martResult, revenueAtRiskResult] =
    await Promise.all([
      supabase
        .from("trucks")
        .select("id, last_telematics_at, status")
        .eq("tenant_id", tenantId)
        .neq("status", "retired"),
      supabase
        .from("fleet_jobs")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("scheduled_start", dayStart)
        .lte("scheduled_start", dayEnd)
        .not("status", "eq", "cancelled"),
      supabase
        .from("fleet_jobs")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "unassigned"),
      supabase
        .from("utilization_daily")
        .select("billable_hours, total_hours, contribution, deadhead_cost, overtime_cost, revenue")
        .eq("tenant_id", tenantId)
        .eq("date", today),
      supabase
        .from("fleet_jobs")
        .select("revenue_estimate")
        .eq("tenant_id", tenantId)
        .eq("status", "unassigned"),
    ]);

  if (trucksResult.error) throw new Error(trucksResult.error.message);
  if (jobsTodayResult.error) throw new Error(jobsTodayResult.error.message);
  if (unassignedCountResult.error) throw new Error(unassignedCountResult.error.message);
  if (martResult.error) throw new Error(martResult.error.message);
  if (revenueAtRiskResult.error) throw new Error(revenueAtRiskResult.error.message);

  const truckList = trucksResult.data ?? [];
  let activeTrucks = 0;
  let idleTrucks = 0;
  for (const truck of truckList) {
    const row = truck as { status: string; last_telematics_at: string | null };
    if (row.status !== "active") continue;
    const status = computeTelematicsStatus(row.last_telematics_at);
    if (status === "online") activeTrucks += 1;
    else idleTrucks += 1;
  }

  const martRows = martResult.data ?? [];
  let utilizationPercent: number | null = null;
  let estimatedContributionToday = 0;
  let deadheadCostToday = 0;
  let overtimeCostToday = 0;
  let revenueScheduledToday = 0;

  if (martRows.length > 0) {
    const totalBillable = martRows.reduce(
      (sum, r) => sum + Number((r as { billable_hours: number }).billable_hours),
      0
    );
    const totalHours = martRows.reduce(
      (sum, r) => sum + Number((r as { total_hours: number }).total_hours),
      0
    );
    if (totalHours > 0) {
      utilizationPercent = Math.min(100, Math.round((totalBillable / totalHours) * 10000) / 100);
    }
    estimatedContributionToday = martRows.reduce(
      (sum, r) => sum + Number((r as { contribution: number }).contribution),
      0
    );
    deadheadCostToday = martRows.reduce(
      (sum, r) => sum + Number((r as { deadhead_cost: number }).deadhead_cost),
      0
    );
    overtimeCostToday = martRows.reduce(
      (sum, r) => sum + Number((r as { overtime_cost: number }).overtime_cost),
      0
    );
    revenueScheduledToday = martRows.reduce(
      (sum, r) => sum + Number((r as { revenue: number }).revenue),
      0
    );
  }

  const revenueAtRisk = (revenueAtRiskResult.data ?? []).reduce(
    (sum, row) => sum + Number((row as { revenue_estimate: number }).revenue_estimate || 0),
    0
  );

  const truckCount = truckList.filter((t) => (t as { status: string }).status === "active").length;

  return {
    activeTrucks,
    idleTrucks,
    jobsToday: jobsTodayResult.count ?? 0,
    unassignedJobs: unassignedCountResult.count ?? 0,
    utilizationPercent,
    revenuePerTruckMtd: null,
    truckCount,
    revenueScheduledToday,
    estimatedContributionToday,
    contributionAtRisk: revenueAtRisk,
    revenueAtRisk,
    overtimeCostToday,
    deadheadCostToday,
    idleCostToday: undefined,
    laborCostToday: undefined,
    recommendationOpportunity: undefined,
  };
}
