import type { SupabaseClient } from "@supabase/supabase-js";
import { loadFleetCommandCenterData } from "../../src/lib/fleet/queries/command-center";
import { loadFleetDispatchBoardData } from "../../src/lib/fleet/queries/dispatch-board";
import { loadFleetTodayViewData } from "../../src/lib/fleet/queries/today-view";
import { getFleetRecommendations } from "../../src/lib/fleet-recommendation-engine/service";
import { PEACHTREE_TENANT } from "./constants";

export type ValidationCheck = {
  name: string;
  pass: boolean;
  detail: string;
};

export async function validatePeachtreeFleetDemo(
  supabase: SupabaseClient,
  tenantId?: string
): Promise<{ checks: ValidationCheck[]; allPass: boolean }> {
  let tid = tenantId;
  if (!tid) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", PEACHTREE_TENANT.slug)
      .maybeSingle();
    if (!tenant?.id) {
      return {
        allPass: false,
        checks: [{ name: "Tenant exists", pass: false, detail: "Peachtree tenant not found" }],
      };
    }
    tid = tenant.id as string;
  }

  const checks: ValidationCheck[] = [];

  const { count: truckCount } = await supabase
    .from("trucks")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid);
  checks.push({
    name: "38 trucks",
    pass: (truckCount ?? 0) >= 38,
    detail: `${truckCount ?? 0} trucks`,
  });

  const { count: siteCount } = await supabase
    .from("customer_sites")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid);
  checks.push({
    name: "30+ customer sites",
    pass: (siteCount ?? 0) >= 30,
    detail: `${siteCount ?? 0} sites`,
  });

  const { count: jobCount } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid);
  checks.push({
    name: "200+ jobs",
    pass: (jobCount ?? 0) >= 200,
    detail: `${jobCount ?? 0} jobs`,
  });

  const { count: completedCount } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid)
    .eq("status", "completed");
  checks.push({
    name: "150+ completed jobs",
    pass: (completedCount ?? 0) >= 150,
    detail: `${completedCount ?? 0} completed`,
  });

  const { count: unassignedCount } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid)
    .eq("status", "unassigned");
  checks.push({
    name: "6+ unassigned jobs",
    pass: (unassignedCount ?? 0) >= 6,
    detail: `${unassignedCount ?? 0} unassigned`,
  });

  const { count: telematicsCount } = await supabase
    .from("telematics_events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid);
  checks.push({
    name: "Telematics populated",
    pass: (telematicsCount ?? 0) >= 200,
    detail: `${telematicsCount ?? 0} events`,
  });

  const { count: martCount } = await supabase
    .from("utilization_daily")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid);
  checks.push({
    name: "Utilization mart populated",
    pass: (martCount ?? 0) >= 100,
    detail: `${martCount ?? 0} utilization rows`,
  });

  const commandCenter = await loadFleetCommandCenterData(supabase, tid);
  checks.push({
    name: "Command Center KPIs",
    pass:
      commandCenter.truckCount >= 38 &&
      (commandCenter.jobsToday ?? 0) >= 10 &&
      (commandCenter.unassignedJobs ?? 0) >= 4,
    detail: `trucks=${commandCenter.truckCount}, jobsToday=${commandCenter.jobsToday}, unassigned=${commandCenter.unassignedJobs}, util=${commandCenter.utilizationPercent ?? "n/a"}%`,
  });

  const dispatch = await loadFleetDispatchBoardData(
    supabase,
    tid,
    new Date().toISOString().slice(0, 10)
  );
  checks.push({
    name: "Dispatch Intelligence board",
    pass: dispatch.truckLanes.length >= 30 && dispatch.unassignedJobs.length >= 4,
    detail: `${dispatch.truckLanes.length} lanes, ${dispatch.unassignedJobs.length} unassigned queue`,
  });

  const recs = await getFleetRecommendations(supabase, tid);
  checks.push({
    name: "Recommendations generated",
    pass: recs.pending.length >= 3,
    detail: `${recs.pending.length} active recommendations`,
  });

  const todayView = await loadFleetTodayViewData(supabase, tid);
  checks.push({
    name: "Exceptions feed",
    pass: todayView.exceptions.length >= 5,
    detail: `${todayView.exceptions.length} exceptions`,
  });
  checks.push({
    name: "Executive briefing",
    pass: todayView.executiveSummary.length > 80,
    detail: todayView.executiveSummary.slice(0, 120) + "…",
  });
  checks.push({
    name: "Changes since yesterday",
    pass: todayView.changesSinceYesterday.length >= 3,
    detail: `${todayView.changesSinceYesterday.length} metric deltas`,
  });
  checks.push({
    name: "Integration health",
    pass: todayView.integrationHealth.length >= 3,
    detail: `${todayView.integrationHealth.length} connections`,
  });

  const { count: rulesCount } = await supabase
    .from("company_operating_rules")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid);
  checks.push({
    name: "Operating rules seeded",
    pass: (rulesCount ?? 0) >= 1,
    detail: `${rulesCount ?? 0} rule sets`,
  });

  const { data: martSample } = await supabase
    .from("utilization_daily")
    .select("contribution, labor_cost, margin_pct")
    .eq("tenant_id", tid)
    .gt("revenue", 0)
    .limit(20);
  const withContribution = (martSample ?? []).filter(
    (r) => Number((r as { contribution: number }).contribution) !== 0
  ).length;
  checks.push({
    name: "Mart profitability populated",
    pass: withContribution >= 5,
    detail: `${withContribution}/${martSample?.length ?? 0} rows with contribution`,
  });

  checks.push({
    name: "Executive profit insights",
    pass:
      (todayView.executiveInsights?.todaysContribution ?? 0) !== 0 ||
      (commandCenter.estimatedContributionToday ?? 0) !== 0,
    detail: `contribution today=${todayView.executiveInsights?.todaysContribution ?? commandCenter.estimatedContributionToday ?? 0}`,
  });

  const allPass = checks.every((c) => c.pass);
  return { checks, allPass };
}

export function printValidationReport(checks: ValidationCheck[], allPass: boolean): void {
  console.log("\n--- Peachtree Fleet Demo Validation ---");
  for (const c of checks) {
    console.log(`  ${c.pass ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  }
  console.log(allPass ? "\nAll checks passed.\n" : "\nSome checks failed.\n");
}
