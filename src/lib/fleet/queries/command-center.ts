import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetCommandCenterData } from "@/src/types/fleet";
import { computeTelematicsStatus } from "@/src/lib/fleet/queries";
import { loadTenantProfitabilitySummary } from "@/src/lib/operational-profitability/queries";

function startOfMonthIso(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function loadFleetCommandCenterData(
  supabase: SupabaseClient,
  tenantId: string
): Promise<FleetCommandCenterData> {
  const today = todayDateOnly();
  const monthStart = startOfMonthIso();

  const { data: trucks, error: trucksError } = await supabase
    .from("trucks")
    .select("id, last_telematics_at, status")
    .eq("tenant_id", tenantId)
    .neq("status", "retired");

  if (trucksError) throw new Error(trucksError.message);

  const truckList = trucks ?? [];
  let activeTrucks = 0;
  let idleTrucks = 0;

  for (const truck of truckList) {
    const row = truck as { status: string; last_telematics_at: string | null };
    if (row.status !== "active") continue;
    const status = computeTelematicsStatus(row.last_telematics_at);
    if (status === "online") activeTrucks += 1;
    else idleTrucks += 1;
  }

  const dayStart = `${today}T00:00:00.000Z`;
  const dayEnd = `${today}T23:59:59.999Z`;

  const { count: jobsToday, error: jobsError } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("scheduled_start", dayStart)
    .lte("scheduled_start", dayEnd)
    .not("status", "eq", "cancelled");

  if (jobsError) throw new Error(jobsError.message);

  const { count: unassignedJobs, error: unassignedError } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "unassigned");

  if (unassignedError) throw new Error(unassignedError.message);

  const { data: todayMart, error: martError } = await supabase
    .from("utilization_daily")
    .select("billable_hours, total_hours, revenue")
    .eq("tenant_id", tenantId)
    .eq("date", today);

  if (martError) throw new Error(martError.message);

  let utilizationPercent: number | null = null;
  const martRows = todayMart ?? [];
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
      utilizationPercent = Math.min(
        100,
        Math.round((totalBillable / totalHours) * 10000) / 100
      );
    }
  }

  const { data: mtdMart, error: mtdError } = await supabase
    .from("utilization_daily")
    .select("revenue, truck_id")
    .eq("tenant_id", tenantId)
    .gte("date", monthStart)
    .lte("date", today);

  if (mtdError) throw new Error(mtdError.message);

  const mtdRows = mtdMart ?? [];
  const totalRevenue = mtdRows.reduce(
    (sum, r) => sum + Number((r as { revenue: number }).revenue),
    0
  );
  const trucksWithRevenue = new Set(
    mtdRows
      .filter((r) => Number((r as { revenue: number }).revenue) > 0)
      .map((r) => (r as { truck_id: string }).truck_id)
  ).size;
  const truckCount = truckList.filter((t) => (t as { status: string }).status === "active").length;

  const revenuePerTruckMtd =
    truckCount > 0 ? Math.round((totalRevenue / truckCount) * 100) / 100 : null;

  const profitability = await loadTenantProfitabilitySummary(supabase, tenantId, today);

  return {
    activeTrucks,
    idleTrucks,
    jobsToday: jobsToday ?? 0,
    unassignedJobs: unassignedJobs ?? 0,
    utilizationPercent,
    revenuePerTruckMtd,
    truckCount,
    revenueScheduledToday: profitability.revenueScheduledToday,
    estimatedContributionToday: profitability.estimatedContributionToday,
    contributionAtRisk: profitability.contributionAtRisk,
    revenueAtRisk: profitability.revenueAtRisk,
    overtimeCostToday: profitability.overtimeCostToday,
    deadheadCostToday: profitability.deadheadCostToday,
    idleCostToday: profitability.idleCostToday,
    laborCostToday: profitability.laborCostToday,
    recommendationOpportunity: profitability.recommendationOpportunity,
  };
}
