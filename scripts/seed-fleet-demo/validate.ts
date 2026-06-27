import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateTruckJobHardConstraints } from "../../src/lib/fleet-recommendation-engine/constraints";
import { loadFleetCommandCenterData } from "../../src/lib/fleet/queries/command-center";
import { loadFleetDispatchBoardData } from "../../src/lib/fleet/queries/dispatch-board";
import { loadFleetTodayViewData } from "../../src/lib/fleet/queries/today-view";
import { getFleetRecommendations } from "../../src/lib/fleet-recommendation-engine/service";
import {
  DEMO_DAY_UNASSIGNED_TARGET,
  MART_HISTORY_DAYS,
  PEACHTREE_TENANT,
  TOTAL_OPERATORS,
  TOTAL_TRUCKS,
} from "./constants";
import { demoBoardDate } from "./utils";

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
  const boardDate = demoBoardDate();

  const { count: truckCount } = await supabase
    .from("trucks")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid);
  checks.push({
    name: `${TOTAL_TRUCKS} trucks`,
    pass: truckCount === TOTAL_TRUCKS,
    detail: `${truckCount ?? 0} trucks`,
  });

  const { data: truckCoords } = await supabase
    .from("trucks")
    .select("home_latitude, home_longitude")
    .eq("tenant_id", tid);
  const trucksWithCoords = (truckCoords ?? []).filter(
    (t) =>
      (t as { home_latitude: number | null; home_longitude: number | null }).home_latitude !=
        null &&
      (t as { home_latitude: number | null; home_longitude: number | null }).home_longitude !=
        null
  ).length;
  checks.push({
    name: "Trucks have map coordinates",
    pass: trucksWithCoords >= TOTAL_TRUCKS,
    detail: `${trucksWithCoords}/${truckCount ?? 0} with home lat/lng`,
  });

  const { count: operatorCount } = await supabase
    .from("fleet_operators")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid);
  checks.push({
    name: `${TOTAL_OPERATORS} operators`,
    pass: operatorCount === TOTAL_OPERATORS,
    detail: `${operatorCount ?? 0} operators`,
  });

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tid)
    .maybeSingle();
  const { count: customerCount } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company?.id ?? "");
  checks.push({
    name: "25+ customers",
    pass: (customerCount ?? 0) >= 25,
    detail: `${customerCount ?? 0} customers`,
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
    name: "340+ jobs",
    pass: (jobCount ?? 0) >= 340,
    detail: `${jobCount ?? 0} jobs`,
  });

  const dayStart = `${boardDate}T00:00:00.000Z`;
  const dayEnd = `${boardDate}T23:59:59.999Z`;
  const { count: demoDayJobs } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid)
    .gte("scheduled_start", dayStart)
    .lte("scheduled_start", dayEnd)
    .not("status", "eq", "cancelled");
  checks.push({
    name: "38+ demo-day jobs",
    pass: (demoDayJobs ?? 0) >= 38,
    detail: `${demoDayJobs ?? 0} jobs on ${boardDate}`,
  });

  const { count: unassignedCount } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid)
    .eq("status", "unassigned")
    .gte("scheduled_start", dayStart)
    .lte("scheduled_start", dayEnd);
  checks.push({
    name: `${DEMO_DAY_UNASSIGNED_TARGET}+ unassigned on demo day`,
    pass: (unassignedCount ?? 0) >= DEMO_DAY_UNASSIGNED_TARGET,
    detail: `${unassignedCount ?? 0} unassigned on ${boardDate}`,
  });

  const { count: telematicsCount } = await supabase
    .from("telematics_events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid);
  checks.push({
    name: "Telematics populated",
    pass: (telematicsCount ?? 0) >= 160,
    detail: `${telematicsCount ?? 0} events`,
  });

  const martFrom = new Date();
  martFrom.setUTCDate(martFrom.getUTCDate() - MART_HISTORY_DAYS);
  const martFromStr = martFrom.toISOString().slice(0, 10);
  const { count: martCount } = await supabase
    .from("utilization_daily")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tid)
    .gte("date", martFromStr);
  checks.push({
    name: "90-day utilization mart",
    pass: (martCount ?? 0) >= 2000,
    detail: `${martCount ?? 0} rows since ${martFromStr}`,
  });

  const { data: jobsMissingCoords } = await supabase
    .from("fleet_jobs")
    .select("id, customer_sites!inner(latitude, longitude)")
    .eq("tenant_id", tid)
    .limit(500);
  const missingJobCoords = (jobsMissingCoords ?? []).filter((row) => {
    const raw = (row as { customer_sites: { latitude: number | null; longitude: number | null } | { latitude: number | null; longitude: number | null }[] })
      .customer_sites;
    const site = Array.isArray(raw) ? raw[0] : raw;
    return site?.latitude == null || site?.longitude == null;
  }).length;
  checks.push({
    name: "All jobs have coordinates",
    pass: missingJobCoords === 0,
    detail: missingJobCoords === 0 ? "all sites geocoded" : `${missingJobCoords} missing`,
  });

  const commandCenter = await loadFleetCommandCenterData(supabase, tid);
  checks.push({
    name: "Command Center KPIs",
    pass:
      (truckCount ?? 0) >= TOTAL_TRUCKS &&
      (commandCenter.jobsToday ?? 0) >= 8 &&
      (commandCenter.unassignedJobs ?? 0) >= DEMO_DAY_UNASSIGNED_TARGET,
    detail: `trucks=${commandCenter.truckCount} active (${truckCount} total), jobsToday=${commandCenter.jobsToday}, unassigned=${commandCenter.unassignedJobs}`,
  });

  const dispatch = await loadFleetDispatchBoardData(supabase, tid, boardDate);
  checks.push({
    name: "Dispatch board (demo day)",
    pass:
      dispatch.truckLanes.length >= TOTAL_TRUCKS &&
      dispatch.unassignedJobs.length >= DEMO_DAY_UNASSIGNED_TARGET,
    detail: `${dispatch.truckLanes.length} lanes, ${dispatch.unassignedJobs.length} unassigned on ${boardDate}`,
  });

  const atsOverload = dispatch.branchCapacity.find(
    (b) => b.branch_name.includes("South") && b.utilization > 1
  );
  checks.push({
    name: "Atlanta South capacity constraint",
    pass: !!atsOverload,
    detail: atsOverload
      ? `${atsOverload.branch_name} at ${Math.round(atsOverload.utilization * 100)}%`
      : "no overloaded branch found",
  });

  const pmTrucks = dispatch.truckLanes.filter((l) => l.maintenance_note).length;
  const offlineGps = dispatch.truckLanes.filter((l) => l.telematics_status === "offline").length;
  const staleGps = dispatch.truckLanes.filter((l) => l.telematics_status === "stale").length;
  checks.push({
    name: "Staged PM conflicts",
    pass: pmTrucks >= 3,
    detail: `${pmTrucks} trucks with PM notes`,
  });
  checks.push({
    name: "Staged GPS issues",
    pass: offlineGps >= 1 && staleGps >= 2,
    detail: `${offlineGps} offline, ${staleGps} stale`,
  });

  const recs = await getFleetRecommendations(supabase, tid, { date: boardDate });
  checks.push({
    name: "5+ recommendations",
    pass: recs.pending.length >= 5,
    detail: `${recs.pending.length} active on ${boardDate}`,
  });

  let invalidRecs = 0;
  for (const rec of recs.pending) {
    if (rec.recommendation_type === "capacity_overload") continue;
    const jobId = rec.rationale.entities?.job_id;
    const truckId = rec.rationale.entities?.truck_id;
    if (!jobId || !truckId) {
      invalidRecs++;
      continue;
    }
    const job = dispatch.jobs.find((j) => j.id === jobId);
    const lane = dispatch.truckLanes.find((l) => l.truck_id === truckId);
    if (!job || !lane) {
      invalidRecs++;
      continue;
    }
    const result = evaluateTruckJobHardConstraints({ job, lane, board: dispatch });
    if (!result.ok) invalidRecs++;
    if (lane.telematics_status === "offline" || lane.telematics_status === "stale") invalidRecs++;
    if (lane.status !== "active" || lane.maintenance_note) invalidRecs++;
  }
  checks.push({
    name: "Recommendations pass hard constraints",
    pass: invalidRecs === 0,
    detail: invalidRecs === 0 ? "all valid" : `${invalidRecs} invalid`,
  });

  const revenueAtRisk = dispatch.unassignedJobs.reduce((s, j) => s + (j.revenue_estimate || 0), 0);
  checks.push({
    name: "Revenue at risk",
    pass: revenueAtRisk >= 31000,
    detail: `$${Math.round(revenueAtRisk).toLocaleString()}`,
  });

  const todayView = await loadFleetTodayViewData(supabase, tid, { date: boardDate, board: dispatch, recommendations: recs });
  checks.push({
    name: "Exceptions feed",
    pass: todayView.exceptions.length >= 8,
    detail: `${todayView.exceptions.length} exceptions`,
  });
  checks.push({
    name: "Executive briefing",
    pass: todayView.executiveSummary.length > 80,
    detail: todayView.executiveSummary.slice(0, 140) + "…",
  });
  checks.push({
    name: "Integration health",
    pass: todayView.integrationHealth.length >= 4,
    detail: `${todayView.integrationHealth.length} connections`,
  });

  const webhookWarning = todayView.integrationHealth.some(
    (c) => c.displayName.includes("Webhook") && c.status !== "healthy"
  );
  checks.push({
    name: "Webhook warning staged",
    pass: webhookWarning,
    detail: webhookWarning ? "dispatch webhook in error/warning" : "no webhook issue",
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

  const allPass = checks.every((c) => c.pass);
  return { checks, allPass };
}

export function printValidationReport(checks: ValidationCheck[], allPass: boolean): void {
  console.log("\n--- Peachtree Industrial Demo Validation ---");
  for (const c of checks) {
    console.log(`  ${c.pass ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  }
  console.log(allPass ? "\nAll checks passed.\n" : "\nSome checks failed.\n");
}
