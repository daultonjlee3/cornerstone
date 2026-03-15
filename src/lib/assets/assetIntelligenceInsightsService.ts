import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { getAssetIntelligenceContext, resolveTenantScope } from "./asset-intelligence-context";
import { getAssetHealthBreakdown } from "./assetHealthService";
import { detectAbnormalRepairFrequency, detectRecurringFailures } from "./assetPatternService";
import type {
  AssetInsightSeverity,
  AssetIntelligenceInsight,
  AssetIntelligenceInsightType,
} from "./intelligence-types";

const DAY_MS = 1000 * 60 * 60 * 24;

function severityRank(severity: AssetInsightSeverity): number {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function sortInsights(insights: AssetIntelligenceInsight[]): AssetIntelligenceInsight[] {
  return [...insights].sort((a, b) => {
    const severityDelta = severityRank(b.severity) - severityRank(a.severity);
    if (severityDelta !== 0) return severityDelta;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function makeInsightId(
  type: AssetIntelligenceInsightType,
  assetId: string,
  suffix: string
): string {
  return `${type}-${assetId}-${suffix}`.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function toAssetName(asset: Record<string, unknown>): string {
  return (
    (asset.asset_name as string | null | undefined) ??
    (asset.name as string | null | undefined) ??
    "Asset"
  );
}

function normalizePatternLabel(patternType: string): string {
  if (patternType.startsWith("recurring_failure:")) {
    return patternType
      .replace("recurring_failure:", "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  if (patternType === "abnormal_repair_frequency") return "Abnormal Repair Frequency";
  return patternType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function daysOverdue(dateOnly: string, todayDateOnly: string): number {
  const left = new Date(`${dateOnly}T00:00:00Z`).getTime();
  const right = new Date(`${todayDateOnly}T00:00:00Z`).getTime();
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  return Math.max(0, Math.round((right - left) / DAY_MS));
}

function severityForReplacement(
  maintenancePct: number | null,
  lifecycleRatio: number | null
): AssetInsightSeverity {
  if ((maintenancePct ?? 0) >= 45 || (lifecycleRatio ?? 0) >= 1) return "critical";
  if ((maintenancePct ?? 0) >= 35 || (lifecycleRatio ?? 0) >= 0.95) return "high";
  if ((maintenancePct ?? 0) >= 30 || (lifecycleRatio ?? 0) >= 0.85) return "medium";
  return "low";
}

export async function detectFailurePatterns(
  assetId: string,
  options?: { supabase?: SupabaseClient }
): Promise<AssetIntelligenceInsight[]> {
  const { supabase, asset } = await getAssetIntelligenceContext(assetId, options?.supabase);
  const assetName = toAssetName(asset);
  const nowIso = new Date().toISOString();

  const [recurring, abnormal] = await Promise.all([
    detectRecurringFailures(assetId, { persist: true, supabase }),
    detectAbnormalRepairFrequency(assetId, { persist: true, supabase }),
  ]);

  const eightMonthsAgo = new Date();
  eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);
  const { data: workOrderRows } = await supabase
    .from("work_orders")
    .select("id")
    .eq("asset_id", assetId)
    .eq("status", "completed")
    .gte("completed_at", eightMonthsAgo.toISOString());
  const workOrderIds = (workOrderRows ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter(Boolean) as string[];

  const { data: partRows } = workOrderIds.length
    ? await supabase
        .from("work_order_part_usage")
        .select("part_name_snapshot")
        .in("work_order_id", workOrderIds)
    : { data: [] as unknown[] };

  const partCounts = new Map<string, number>();
  for (const row of partRows ?? []) {
    const partName = ((row as { part_name_snapshot?: string | null }).part_name_snapshot ?? "").trim();
    if (!partName) continue;
    const key = partName.toLowerCase();
    partCounts.set(key, (partCounts.get(key) ?? 0) + 1);
  }

  const partInsights: AssetIntelligenceInsight[] = [...partCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([partName, count]) => {
      const severity: AssetInsightSeverity = count >= 6 ? "critical" : count >= 4 ? "high" : "medium";
      return {
        id: makeInsightId("parts_replacement_frequency", assetId, partName),
        type: "parts_replacement_frequency",
        severity,
        title: "Frequent part replacement",
        description: `${assetName} replaced ${partName} ${count} times in the last 8 months.`,
        assetId,
        assetName,
        recommendation:
          "Investigate root cause, validate part specification, and review preventive maintenance intervals.",
        createdAt: nowIso,
        companyId: (asset.company_id as string | null | undefined) ?? null,
      };
    });

  const recurringInsights: AssetIntelligenceInsight[] = recurring.map((insight) => ({
    id: makeInsightId("recurring_failure_pattern", assetId, insight.pattern_type),
    type: "recurring_failure_pattern",
    severity: insight.severity,
    title: "Recurring failure pattern",
    description: `${assetName}: ${normalizePatternLabel(insight.pattern_type)} occurred ${insight.frequency} times in the last 12 months.`,
    assetId,
    assetName,
    recommendation: insight.recommendation,
    createdAt: nowIso,
    companyId: (asset.company_id as string | null | undefined) ?? null,
  }));

  const abnormalInsights: AssetIntelligenceInsight[] = abnormal.map((insight) => ({
    id: makeInsightId("abnormal_repair_frequency", assetId, "trend"),
    type: "abnormal_repair_frequency",
    severity: insight.severity,
    title: "Abnormal repair frequency",
    description: `${assetName} has accelerated repair activity in the most recent 90-day window.`,
    assetId,
    assetName,
    recommendation: insight.recommendation,
    createdAt: nowIso,
    companyId: (asset.company_id as string | null | undefined) ?? null,
  }));

  return sortInsights([...recurringInsights, ...abnormalInsights, ...partInsights]);
}

export async function detectReplacementCandidates(
  assetId: string,
  options?: { supabase?: SupabaseClient }
): Promise<AssetIntelligenceInsight[]> {
  const { asset } = await getAssetIntelligenceContext(assetId, options?.supabase);
  const assetName = toAssetName(asset);
  const health = await getAssetHealthBreakdown(assetId);
  const maintenancePct =
    health.repairVsReplaceRatio != null ? Number((health.repairVsReplaceRatio * 100).toFixed(1)) : null;
  const lifecycleRatio =
    health.ageYears != null && health.expectedLifeYears != null && health.expectedLifeYears > 0
      ? Number((health.ageYears / health.expectedLifeYears).toFixed(3))
      : null;
  const agePct = lifecycleRatio != null ? Number((lifecycleRatio * 100).toFixed(1)) : null;

  if ((maintenancePct ?? 0) <= 30 && (lifecycleRatio ?? 0) <= 0.85) return [];

  const reasons: string[] = [];
  if ((maintenancePct ?? 0) > 30) {
    reasons.push(`Maintenance cost reached ${maintenancePct}% of replacement value.`);
  }
  if ((lifecycleRatio ?? 0) > 0.85) {
    reasons.push(
      `Asset age is ${agePct}% of expected lifecycle (${(health.ageYears ?? 0).toFixed(1)} / ${(
        health.expectedLifeYears ?? 0
      ).toFixed(1)} years).`
    );
  }

  const severity = severityForReplacement(maintenancePct, lifecycleRatio);
  return [
    {
      id: makeInsightId("replacement_candidate", assetId, "lifecycle"),
      type: "replacement_candidate",
      severity,
      title: "Replacement candidate",
      description: `${assetName} shows replacement pressure. ${reasons.join(" ")}`.trim(),
      assetId,
      assetName,
      recommendation:
        "Plan replacement in the next capital cycle and prioritize root-cause review until replacement is approved.",
      createdAt: new Date().toISOString(),
      companyId: (asset.company_id as string | null | undefined) ?? null,
    },
  ];
}

export async function detectPMComplianceRisks(
  assetId: string,
  options?: { supabase?: SupabaseClient }
): Promise<AssetIntelligenceInsight[]> {
  const { supabase, asset } = await getAssetIntelligenceContext(assetId, options?.supabase);
  const assetName = toAssetName(asset);
  const today = new Date().toISOString().slice(0, 10);
  const { data: pmPlans } = await supabase
    .from("preventive_maintenance_plans")
    .select("id, next_run_date, status")
    .eq("asset_id", assetId)
    .eq("status", "active");

  const overduePlans = (pmPlans ?? []).filter((plan) => {
    const nextRunDate = (plan as { next_run_date?: string | null }).next_run_date;
    return Boolean(nextRunDate && nextRunDate < today);
  });
  if (overduePlans.length === 0) return [];

  const maxDaysOverdue = overduePlans.reduce((maxValue, plan) => {
    const dateOnly = (plan as { next_run_date?: string | null }).next_run_date;
    if (!dateOnly) return maxValue;
    return Math.max(maxValue, daysOverdue(dateOnly, today));
  }, 0);

  const severity: AssetInsightSeverity =
    overduePlans.length >= 3 || maxDaysOverdue >= 30
      ? "critical"
      : overduePlans.length >= 2 || maxDaysOverdue >= 14
      ? "high"
      : "medium";

  return [
    {
      id: makeInsightId("pm_compliance_risk", assetId, "active"),
      type: "pm_compliance_risk",
      severity,
      title: "PM compliance risk",
      description: `${assetName} has ${overduePlans.length} overdue PM task(s), up to ${maxDaysOverdue} day(s) overdue.`,
      assetId,
      assetName,
      recommendation:
        "Schedule overdue PM immediately and rebalance PM interval to reduce emergency work orders.",
      createdAt: new Date().toISOString(),
      companyId: (asset.company_id as string | null | undefined) ?? null,
    },
  ];
}

async function detectDowntimeRisk(
  assetId: string,
  options?: { supabase?: SupabaseClient }
): Promise<AssetIntelligenceInsight[]> {
  const { supabase, asset } = await getAssetIntelligenceContext(assetId, options?.supabase);
  const assetName = toAssetName(asset);
  const oneEightyDaysAgo = new Date();
  oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

  const { data: rows } = await supabase
    .from("work_orders")
    .select("started_at, completed_at")
    .eq("asset_id", assetId)
    .eq("status", "completed")
    .gte("completed_at", oneEightyDaysAgo.toISOString());

  let totalDowntimeHours = 0;
  let longDowntimeEvents = 0;
  for (const row of rows ?? []) {
    const startedAt = (row as { started_at?: string | null }).started_at;
    const completedAt = (row as { completed_at?: string | null }).completed_at;
    if (!startedAt || !completedAt) continue;
    const hours = (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60);
    if (!Number.isFinite(hours) || hours <= 0) continue;
    totalDowntimeHours += hours;
    if (hours >= 8) longDowntimeEvents += 1;
  }
  const roundedHours = Number(totalDowntimeHours.toFixed(1));
  if (roundedHours < 24 && longDowntimeEvents < 2) return [];

  const severity: AssetInsightSeverity =
    roundedHours >= 72 || longDowntimeEvents >= 4 ? "critical" : roundedHours >= 40 ? "high" : "medium";
  return [
    {
      id: makeInsightId("downtime_risk", assetId, "180d"),
      type: "downtime_risk",
      severity,
      title: "Downtime accumulation risk",
      description: `${assetName} logged ${roundedHours} downtime hour(s) over the last 180 days (${longDowntimeEvents} extended event(s)).`,
      assetId,
      assetName,
      recommendation:
        "Escalate reliability review and schedule targeted inspection for primary failure points.",
      createdAt: new Date().toISOString(),
      companyId: (asset.company_id as string | null | undefined) ?? null,
    },
  ];
}

export async function generateAssetInsightForAsset(
  assetId: string,
  options?: { supabase?: SupabaseClient }
): Promise<AssetIntelligenceInsight[]> {
  const { supabase, asset } = await getAssetIntelligenceContext(assetId, options?.supabase);
  const assetName = toAssetName(asset);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [{ count: completedCount }, health, patternInsights, replacementInsights, pmInsights, downtimeInsights] =
    await Promise.all([
      supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("asset_id", assetId)
        .eq("status", "completed")
        .gte("completed_at", sixMonthsAgo.toISOString()),
      getAssetHealthBreakdown(assetId),
      detectFailurePatterns(assetId, { supabase }),
      detectReplacementCandidates(assetId, { supabase }),
      detectPMComplianceRisks(assetId, { supabase }),
      detectDowntimeRisk(assetId, { supabase }),
    ]);

  const failureCount = Number(completedCount ?? 0);
  const healthInsights: AssetIntelligenceInsight[] = [];
  if (health.healthScore <= 45) {
    healthInsights.push({
      id: makeInsightId("critical_asset_health", assetId, "health"),
      type: "critical_asset_health",
      severity: health.healthScore <= 30 ? "critical" : "high",
      title: "Critical asset health",
      description: `${assetName} has health score ${health.healthScore.toFixed(
        0
      )} with ${failureCount} completed work order(s) in 6 months.`,
      assetId,
      assetName,
      recommendation:
        "Schedule diagnostic inspection now and evaluate replacement if reliability does not improve.",
      createdAt: health.lastCalculatedAt,
      companyId: (asset.company_id as string | null | undefined) ?? null,
    });
  } else if (health.failureRisk >= 80) {
    healthInsights.push({
      id: makeInsightId("high_failure_risk", assetId, "risk"),
      type: "high_failure_risk",
      severity: health.failureRisk >= 90 ? "critical" : "high",
      title: "High failure risk",
      description: `${assetName} has failure risk ${health.failureRisk.toFixed(0)} and health score ${health.healthScore.toFixed(0)}.`,
      assetId,
      assetName,
      recommendation: "Prioritize proactive maintenance in the next dispatch cycle.",
      createdAt: health.lastCalculatedAt,
      companyId: (asset.company_id as string | null | undefined) ?? null,
    });
  }

  const insights = sortInsights([
    ...healthInsights,
    ...patternInsights,
    ...replacementInsights,
    ...pmInsights,
    ...downtimeInsights,
  ]);

  const seen = new Set<string>();
  return insights.filter((insight) => {
    const key = `${insight.type}-${insight.assetId}-${insight.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function generateAssetInsights(
  tenantId: string,
  options?: {
    companyId?: string | null;
    companyIds?: string[];
    limit?: number;
    supabase?: SupabaseClient;
  }
): Promise<AssetIntelligenceInsight[]> {
  const scopedSupabase =
    options?.supabase ?? ((await createClient()) as unknown as SupabaseClient);

  let scopedCompanyIds: string[];
  if (options?.companyIds != null && options.companyIds.length > 0) {
    scopedCompanyIds =
      options?.companyId && options.companyIds.includes(options.companyId)
        ? [options.companyId]
        : options.companyIds;
  } else {
    const scope = await resolveTenantScope(scopedSupabase);
    if (scope.tenantId !== tenantId) throw new Error("Unauthorized.");
    scopedCompanyIds =
      options?.companyId && scope.companyIds.includes(options.companyId)
        ? [options.companyId]
        : scope.companyIds;
  }
  const limit = Math.max(1, Math.min(options?.limit ?? 50, 200));
  const todayDateOnly = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const loader = unstable_cache(
    async (): Promise<AssetIntelligenceInsight[]> => {
      const [assetsRows, insightRows, pmRows, workOrderRows] = await Promise.all([
        scopedSupabase
          .from("assets")
          .select(
            "id, company_id, asset_name, name, health_score, failure_risk, maintenance_cost_last_12_months, replacement_cost, expected_life_years, install_date, last_health_calculation"
          )
          .in("company_id", scopedCompanyIds),
        scopedSupabase
          .from("asset_insights")
          .select(
            "asset_id, pattern_type, frequency, recommendation, severity, detected_at, is_active"
          )
          .in("company_id", scopedCompanyIds)
          .eq("is_active", true),
        scopedSupabase
          .from("preventive_maintenance_plans")
          .select("asset_id, next_run_date, status")
          .in("company_id", scopedCompanyIds)
          .eq("status", "active"),
        scopedSupabase
          .from("work_orders")
          .select("asset_id, category, started_at, completed_at")
          .in("company_id", scopedCompanyIds)
          .eq("status", "completed")
          .gte("completed_at", sixMonthsAgo.toISOString()),
      ]);

      const assets = (assetsRows.data ?? []) as Record<string, unknown>[];
      const assetById = new Map<string, Record<string, unknown>>();
      for (const asset of assets) {
        const assetId = (asset.id as string | undefined) ?? null;
        if (!assetId) continue;
        assetById.set(assetId, asset);
      }

      const workOrderStatsByAsset = new Map<
        string,
        { failures: number; downtimeHours: number; longDowntimeEvents: number }
      >();
      for (const row of workOrderRows.data ?? []) {
        const typed = row as Record<string, unknown>;
        const assetId = (typed.asset_id as string | null) ?? null;
        if (!assetId) continue;
        const stats = workOrderStatsByAsset.get(assetId) ?? {
          failures: 0,
          downtimeHours: 0,
          longDowntimeEvents: 0,
        };
        if (["repair", "emergency"].includes(String(typed.category ?? ""))) {
          stats.failures += 1;
        }
        const startedAt = (typed.started_at as string | null) ?? null;
        const completedAt = (typed.completed_at as string | null) ?? null;
        if (startedAt && completedAt) {
          const hours = (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60);
          if (Number.isFinite(hours) && hours > 0) {
            stats.downtimeHours += hours;
            if (hours >= 8) stats.longDowntimeEvents += 1;
          }
        }
        workOrderStatsByAsset.set(assetId, stats);
      }

      const pmOverdueByAsset = new Map<string, { count: number; maxDays: number }>();
      for (const row of pmRows.data ?? []) {
        const typed = row as Record<string, unknown>;
        const assetId = (typed.asset_id as string | null) ?? null;
        const nextRunDate = (typed.next_run_date as string | null) ?? null;
        if (!assetId || !nextRunDate || nextRunDate >= todayDateOnly) continue;
        const existing = pmOverdueByAsset.get(assetId) ?? { count: 0, maxDays: 0 };
        const overdue = daysOverdue(nextRunDate, todayDateOnly);
        pmOverdueByAsset.set(assetId, {
          count: existing.count + 1,
          maxDays: Math.max(existing.maxDays, overdue),
        });
      }

      const nowIso = new Date().toISOString();
      const insights: AssetIntelligenceInsight[] = [];
      for (const asset of assets) {
        const assetId = (asset.id as string | null) ?? null;
        if (!assetId) continue;
        const assetName = toAssetName(asset);
        const companyId = (asset.company_id as string | null | undefined) ?? null;
        const healthScore = Number((asset.health_score as number | null | undefined) ?? NaN);
        const failureRisk = Number((asset.failure_risk as number | null | undefined) ?? NaN);
        const maintenanceCost = Number(
          (asset.maintenance_cost_last_12_months as number | null | undefined) ?? 0
        );
        const replacementCost =
          Number((asset.replacement_cost as number | null | undefined) ?? NaN) || null;
        const expectedLifeYears =
          Number((asset.expected_life_years as number | null | undefined) ?? NaN) || null;
        const installDate = (asset.install_date as string | null) ?? null;
        const ageYears = installDate
          ? (Date.now() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
          : null;
        const lifecycleRatio =
          ageYears != null && expectedLifeYears != null && expectedLifeYears > 0
            ? ageYears / expectedLifeYears
            : null;
        const maintenancePct =
          replacementCost && replacementCost > 0
            ? Number(((maintenanceCost / replacementCost) * 100).toFixed(1))
            : null;
        const woStats = workOrderStatsByAsset.get(assetId) ?? {
          failures: 0,
          downtimeHours: 0,
          longDowntimeEvents: 0,
        };
        const pmOverdue = pmOverdueByAsset.get(assetId) ?? { count: 0, maxDays: 0 };

        if ((Number.isFinite(healthScore) && healthScore <= 45) || (Number.isFinite(failureRisk) && failureRisk >= 90)) {
          insights.push({
            id: makeInsightId("critical_asset_health", assetId, "portfolio"),
            type: "critical_asset_health",
            severity: Number.isFinite(healthScore) && healthScore <= 30 ? "critical" : "high",
            title: "Critical asset health",
            description: `${assetName} has health ${Number.isFinite(healthScore) ? healthScore.toFixed(0) : "—"} and ${woStats.failures} failure-type work order(s) in 6 months.`,
            assetId,
            assetName,
            recommendation:
              "Dispatch diagnostic inspection and create a corrective reliability action plan.",
            createdAt:
              (asset.last_health_calculation as string | null | undefined) ?? nowIso,
            companyId,
          });
        } else if (Number.isFinite(failureRisk) && failureRisk >= 80) {
          insights.push({
            id: makeInsightId("high_failure_risk", assetId, "portfolio"),
            type: "high_failure_risk",
            severity: failureRisk >= 90 ? "critical" : "high",
            title: "High failure risk",
            description: `${assetName} has failure risk ${failureRisk.toFixed(0)} and health ${Number.isFinite(healthScore) ? healthScore.toFixed(0) : "—"}.`,
            assetId,
            assetName,
            recommendation: "Prioritize proactive work before the next peak load period.",
            createdAt:
              (asset.last_health_calculation as string | null | undefined) ?? nowIso,
            companyId,
          });
        }

        if ((maintenancePct ?? 0) > 30 || (lifecycleRatio ?? 0) > 0.85) {
          insights.push({
            id: makeInsightId("replacement_candidate", assetId, "portfolio"),
            type: "replacement_candidate",
            severity: severityForReplacement(maintenancePct, lifecycleRatio),
            title: "Replacement candidate",
            description: `${assetName} is at ${(((lifecycleRatio ?? 0) * 100)).toFixed(
              1
            )}% lifecycle and maintenance cost is ${maintenancePct?.toFixed(1) ?? "—"}% of replacement.`,
            assetId,
            assetName,
            recommendation:
              "Prepare replacement scope and budget while stabilizing with targeted maintenance.",
            createdAt:
              (asset.last_health_calculation as string | null | undefined) ?? nowIso,
            companyId,
          });
        } else if ((maintenancePct ?? 0) >= 20) {
          insights.push({
            id: makeInsightId("maintenance_cost_pressure", assetId, "portfolio"),
            type: "maintenance_cost_pressure",
            severity: (maintenancePct ?? 0) >= 30 ? "high" : "medium",
            title: "Maintenance cost pressure",
            description: `${assetName} maintenance spend is ${maintenancePct?.toFixed(
              1
            )}% of replacement value.`,
            assetId,
            assetName,
            recommendation:
              "Monitor monthly trend and define a replace-vs-repair trigger before costs escalate.",
            createdAt: nowIso,
            companyId,
          });
        }

        if (pmOverdue.count > 0) {
          insights.push({
            id: makeInsightId("pm_compliance_risk", assetId, "portfolio"),
            type: "pm_compliance_risk",
            severity:
              pmOverdue.count >= 3 || pmOverdue.maxDays >= 30
                ? "critical"
                : pmOverdue.count >= 2 || pmOverdue.maxDays >= 14
                ? "high"
                : "medium",
            title: "PM compliance risk",
            description: `${assetName} has ${pmOverdue.count} overdue PM plan(s), max ${pmOverdue.maxDays} day(s) late.`,
            assetId,
            assetName,
            recommendation: "Schedule PM backlog this week and rebalance PM cadence.",
            createdAt: nowIso,
            companyId,
          });
        }

        const downtimeHours = Number(woStats.downtimeHours.toFixed(1));
        if (downtimeHours >= 24 || woStats.longDowntimeEvents >= 2) {
          insights.push({
            id: makeInsightId("downtime_risk", assetId, "portfolio"),
            type: "downtime_risk",
            severity:
              downtimeHours >= 72 || woStats.longDowntimeEvents >= 4
                ? "critical"
                : downtimeHours >= 40
                ? "high"
                : "medium",
            title: "Downtime risk",
            description: `${assetName} logged ${downtimeHours} downtime hour(s) in 6 months.`,
            assetId,
            assetName,
            recommendation:
              "Escalate reliability review and prioritize uptime-focused corrective actions.",
            createdAt: nowIso,
            companyId,
          });
        }
      }

      for (const row of insightRows.data ?? []) {
        const insight = row as Record<string, unknown>;
        const assetId = (insight.asset_id as string | null) ?? null;
        if (!assetId) continue;
        const asset = assetById.get(assetId);
        if (!asset) continue;
        const patternType = String(insight.pattern_type ?? "");
        if (
          !patternType.startsWith("recurring_failure:") &&
          patternType !== "abnormal_repair_frequency"
        ) {
          continue;
        }
        const assetName = toAssetName(asset);
        insights.push({
          id: makeInsightId("recurring_failure_pattern", assetId, patternType),
          type:
            patternType === "abnormal_repair_frequency"
              ? "abnormal_repair_frequency"
              : "recurring_failure_pattern",
          severity: (insight.severity as AssetInsightSeverity) ?? "medium",
          title:
            patternType === "abnormal_repair_frequency"
              ? "Abnormal repair frequency"
              : "Recurring failure pattern",
          description: `${assetName}: ${normalizePatternLabel(patternType)} observed ${Number(
            insight.frequency ?? 0
          )} time(s).`,
          assetId,
          assetName,
          recommendation:
            (insight.recommendation as string | null) ??
            "Review root cause and adjust maintenance plan.",
          createdAt: (insight.detected_at as string | null) ?? nowIso,
          companyId: (asset.company_id as string | null | undefined) ?? null,
        });
      }

      const seen = new Set<string>();
      return sortInsights(insights)
        .filter((insight) => {
          const key = `${insight.type}-${insight.assetId}-${insight.title}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, limit);
    },
    [
      `asset-intelligence-insights-${tenantId}-${scopedCompanyIds.join(",") || "none"}-${limit}`,
    ],
    {
      revalidate: 300,
      tags: [
        "asset-intelligence-insights",
        ...scopedCompanyIds.map((companyId) => `asset-intelligence-company-${companyId}`),
      ],
    }
  );

  return loader();
}

export async function getPortfolioFailurePatterns(
  tenantId: string,
  options?: {
    companyId?: string | null;
    companyIds?: string[];
    limit?: number;
    supabase?: SupabaseClient;
  }
): Promise<
  Array<{
    patternKey: string;
    label: string;
    occurrences: number;
    affectedAssets: number;
    severity: AssetInsightSeverity;
    recommendation: string;
  }>
> {
  const scopedSupabase =
    options?.supabase ?? ((await createClient()) as unknown as SupabaseClient);

  let scopedCompanyIds: string[];
  if (options?.companyIds != null && options.companyIds.length > 0) {
    scopedCompanyIds =
      options?.companyId && options.companyIds.includes(options.companyId)
        ? [options.companyId]
        : options.companyIds;
  } else {
    const scope = await resolveTenantScope(scopedSupabase);
    if (scope.tenantId !== tenantId) throw new Error("Unauthorized.");
    scopedCompanyIds =
      options?.companyId && scope.companyIds.includes(options.companyId)
        ? [options.companyId]
        : scope.companyIds;
  }

  const limit = Math.max(1, Math.min(options?.limit ?? 10, 25));

  const loader = unstable_cache(
    async () => {
      const { data: rows } = await scopedSupabase
        .from("asset_insights")
        .select("asset_id, pattern_type, frequency, severity, recommendation")
        .in("company_id", scopedCompanyIds)
        .eq("is_active", true);

      const groups = new Map<
        string,
        {
          label: string;
          occurrences: number;
          assets: Set<string>;
          severity: AssetInsightSeverity;
          recommendation: string;
        }
      >();
      for (const row of rows ?? []) {
        const typed = row as Record<string, unknown>;
        const rawPatternType = String(typed.pattern_type ?? "");
        if (
          !rawPatternType.startsWith("recurring_failure:") &&
          rawPatternType !== "abnormal_repair_frequency"
        ) {
          continue;
        }

        const patternKey =
          rawPatternType === "abnormal_repair_frequency"
            ? rawPatternType
            : rawPatternType.replace("recurring_failure:", "");
        const label =
          rawPatternType === "abnormal_repair_frequency"
            ? "Abnormal Repair Frequency"
            : normalizePatternLabel(rawPatternType);
        const frequency = Number(typed.frequency ?? 0);
        const severity = (typed.severity as AssetInsightSeverity) ?? "medium";
        const existing = groups.get(patternKey) ?? {
          label,
          occurrences: 0,
          assets: new Set<string>(),
          severity: "low" as AssetInsightSeverity,
          recommendation:
            (typed.recommendation as string | null | undefined) ??
            "Review reliability strategy for affected assets.",
        };
        existing.occurrences += Math.max(1, frequency);
        const assetId = (typed.asset_id as string | null) ?? null;
        if (assetId) existing.assets.add(assetId);
        if (severityRank(severity) > severityRank(existing.severity)) {
          existing.severity = severity;
        }
        groups.set(patternKey, existing);
      }

      return [...groups.entries()]
        .map(([patternKey, value]) => ({
          patternKey,
          label: value.label,
          occurrences: value.occurrences,
          affectedAssets: value.assets.size,
          severity: value.severity,
          recommendation: value.recommendation,
        }))
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, limit);
    },
    [
      `asset-intelligence-failure-patterns-${tenantId}-${scopedCompanyIds.join(",") || "none"}-${limit}`,
    ],
    {
      revalidate: 300,
      tags: [
        "asset-intelligence-failure-patterns",
        ...scopedCompanyIds.map((companyId) => `asset-intelligence-company-${companyId}`),
      ],
    }
  );

  return loader();
}
