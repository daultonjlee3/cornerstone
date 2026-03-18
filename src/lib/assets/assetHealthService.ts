import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { insertActivityLog } from "@/src/lib/activity-logs";
import { getAssetIntelligenceContext } from "./asset-intelligence-context";
import { detectAbnormalRepairFrequency, detectRecurringFailures } from "./assetPatternService";
import type {
  AssetFailureRiskResult,
  AssetHealthBreakdown,
  HealthCategory,
} from "./intelligence-types";

const FAILURE_NOTE_TOKENS = [
  "failure",
  "failed",
  "overheat",
  "burn",
  "reset",
  "leak",
  "trip",
  "fault",
  "shutdown",
];

const LABOR_HOURLY_RATE_FALLBACK = 95;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function toHealthCategory(score: number): HealthCategory {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "warning";
  if (score >= 30) return "poor";
  return "critical";
}

function categoryLabel(category: HealthCategory): string {
  if (category === "excellent") return "Excellent";
  if (category === "good") return "Good";
  if (category === "warning") return "Warning";
  if (category === "poor") return "Poor";
  return "Critical";
}

function toRiskLabel(risk: number): "low" | "moderate" | "high" | "urgent" {
  if (risk >= 80) return "urgent";
  if (risk >= 60) return "high";
  if (risk >= 35) return "moderate";
  return "low";
}

function yearsBetween(from: Date, to: Date): number {
  return Number(((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2));
}

function getStaleCutoff(hours: number): Date {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);
  return cutoff;
}

function recommendationForBreakdown(
  category: HealthCategory,
  factors: Array<{ label: string; impact: number; reason: string }>
): string {
  const topFactors = [...factors]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map((factor) => factor.reason);
  if (topFactors.length === 0) {
    return "Asset performance is stable. Continue preventive maintenance and monitor service quality.";
  }
  if (category === "critical" || category === "poor") {
    return `Immediate action recommended: ${topFactors.join(" ")}`;
  }
  if (category === "warning") {
    return `Plan corrective action in the next maintenance cycle: ${topFactors.join(" ")}`;
  }
  return `Maintain current strategy and monitor trends: ${topFactors.join(" ")}`;
}

async function buildBreakdown(
  assetId: string,
  supabase?: SupabaseClient
): Promise<AssetHealthBreakdown> {
  const { supabase: scopedSupabase, tenantId, companyId, asset, userId } =
    await getAssetIntelligenceContext(assetId, supabase);

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setMonth(windowStart.getMonth() - 12);

  const [recurringInsights, abnormalFrequencyInsights] = await Promise.all([
    detectRecurringFailures(assetId, { persist: true, supabase: scopedSupabase }),
    detectAbnormalRepairFrequency(assetId, { persist: true, supabase: scopedSupabase }),
  ]);

  const { data: workOrders } = await scopedSupabase
    .from("work_orders")
    .select(
      "id, title, category, priority, status, started_at, completed_at, completion_notes, root_cause, resolution_summary, actual_hours"
    )
    .eq("asset_id", assetId)
    .gte("created_at", windowStart.toISOString());

  const completedWorkOrders = (workOrders ?? []).filter(
    (row) => (row as { status?: string | null }).status === "completed"
  ) as Record<string, unknown>[];
  const repairWorkOrders = completedWorkOrders.filter((row) =>
    ["repair", "emergency"].includes(String((row as { category?: string | null }).category ?? ""))
  );

  const overdueDate = now.toISOString().slice(0, 10);
  const { data: pmPlans } = await scopedSupabase
    .from("preventive_maintenance_plans")
    .select("id, next_run_date, status")
    .eq("asset_id", assetId)
    .eq("status", "active");

  const overduePmCount = (pmPlans ?? []).filter((row) => {
    const nextRunDate = (row as { next_run_date?: string | null }).next_run_date;
    return Boolean(nextRunDate && nextRunDate < overdueDate);
  }).length;

  const completedWorkOrderIds = completedWorkOrders
    .map((row) => (row.id as string | undefined) ?? null)
    .filter((value): value is string => Boolean(value));
  const { data: partUsageRows } = completedWorkOrderIds.length
    ? await scopedSupabase
        .from("work_order_part_usage")
        .select("work_order_id, total_cost")
        .in("work_order_id", completedWorkOrderIds)
    : { data: [] as unknown[] };

  const { data: noteRows } = completedWorkOrderIds.length
    ? await scopedSupabase
        .from("work_order_notes")
        .select("body")
        .in("work_order_id", completedWorkOrderIds)
    : { data: [] as unknown[] };

  const typedPartUsageRows = (partUsageRows ?? []) as Array<{ total_cost?: number | null }>;
  const typedNoteRows = (noteRows ?? []) as Array<{ body?: string | null }>;

  const partCost = typedPartUsageRows.reduce<number>((sum, row) => {
    const cost = Number(row.total_cost ?? 0);
    return sum + (Number.isFinite(cost) ? cost : 0);
  }, 0);
  const laborHours = completedWorkOrders.reduce<number>((sum, row) => {
    const hours = Number((row.actual_hours as number | null) ?? 0);
    return sum + (Number.isFinite(hours) ? hours : 0);
  }, 0);
  const laborCost = laborHours * LABOR_HOURLY_RATE_FALLBACK;
  const maintenanceCostLast12Months = Number((partCost + laborCost).toFixed(2));

  const downtimeHoursLast12Months = completedWorkOrders.reduce<number>((sum, row) => {
    const startedAt = (row.started_at as string | null) ?? null;
    const completedAt = (row.completed_at as string | null) ?? null;
    if (!startedAt || !completedAt) return sum;
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    if (!Number.isFinite(durationMs) || durationMs <= 0) return sum;
    return sum + durationMs / (1000 * 60 * 60);
  }, 0);

  const negativeTechnicianNoteSignals = [...typedNoteRows, ...completedWorkOrders].reduce<number>(
    (count, row) => {
      const text = [
        (row as { body?: string | null }).body,
        (row as { completion_notes?: string | null }).completion_notes,
        (row as { root_cause?: string | null }).root_cause,
        (row as { resolution_summary?: string | null }).resolution_summary,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!text) return count;
      return (
        count +
        FAILURE_NOTE_TOKENS.reduce(
          (signalCount, token) => signalCount + (text.includes(token) ? 1 : 0),
          0
        )
      );
    },
    0
  );

  const installDateRaw = (asset.install_date as string | null) ?? null;
  const expectedLifeYears =
    Number((asset.expected_life_years as number | null | undefined) ?? NaN) || null;
  const replacementCost =
    Number((asset.replacement_cost as number | null | undefined) ?? NaN) || null;
  const ageYears = installDateRaw ? yearsBetween(new Date(installDateRaw), now) : null;
  const remainingLifeYears =
    ageYears != null && expectedLifeYears != null
      ? Number((expectedLifeYears - ageYears).toFixed(2))
      : null;
  const estimatedReplacementYear =
    installDateRaw && expectedLifeYears != null && expectedLifeYears > 0
      ? new Date(installDateRaw).getFullYear() + Math.round(expectedLifeYears)
      : null;
  const repairVsReplaceRatio =
    replacementCost && replacementCost > 0
      ? Number((maintenanceCostLast12Months / replacementCost).toFixed(4))
      : null;

  const recurringIssueCount = recurringInsights.reduce(
    (sum, insight) => sum + Math.max(1, insight.frequency),
    0
  );

  const factors: Array<{ label: string; impact: number; reason: string }> = [];
  const woVolumePenalty = Math.min(20, completedWorkOrders.length * 1.6);
  if (woVolumePenalty > 0) {
    factors.push({
      label: "work_orders_12_months",
      impact: Number(woVolumePenalty.toFixed(2)),
      reason: `${completedWorkOrders.length} completed work orders were recorded in the last 12 months.`,
    });
  }
  const recurringPenalty = Math.min(18, recurringIssueCount * 3.5);
  if (recurringPenalty > 0) {
    factors.push({
      label: "recurring_failures",
      impact: Number(recurringPenalty.toFixed(2)),
      reason: `${recurringInsights.length} recurring failure patterns are active.`,
    });
  }
  const abnormalPenalty = abnormalFrequencyInsights.length > 0 ? 10 : 0;
  if (abnormalPenalty > 0) {
    factors.push({
      label: "abnormal_repair_frequency",
      impact: abnormalPenalty,
      reason: abnormalFrequencyInsights[0]?.recommendation ?? "Repair frequency is increasing.",
    });
  }
  const overduePmPenalty = Math.min(18, overduePmCount * 6);
  if (overduePmPenalty > 0) {
    factors.push({
      label: "overdue_preventive_maintenance",
      impact: Number(overduePmPenalty.toFixed(2)),
      reason: `${overduePmCount} preventive maintenance task(s) are overdue.`,
    });
  }
  if (ageYears != null && expectedLifeYears != null && expectedLifeYears > 0) {
    const ageRatio = ageYears / expectedLifeYears;
    const agePenalty =
      ageRatio >= 1.2 ? 18 : ageRatio >= 1 ? 14 : ageRatio >= 0.85 ? 9 : ageRatio >= 0.7 ? 4 : 0;
    if (agePenalty > 0) {
      factors.push({
        label: "asset_age",
        impact: agePenalty,
        reason: `Asset age is ${ageYears.toFixed(1)} years against expected life ${expectedLifeYears.toFixed(
          1
        )} years.`,
      });
    }
  }
  const repairFrequencyPenalty =
    repairWorkOrders.length >= 12
      ? 16
      : repairWorkOrders.length >= 8
      ? 12
      : repairWorkOrders.length >= 5
      ? 8
      : repairWorkOrders.length >= 3
      ? 4
      : 0;
  if (repairFrequencyPenalty > 0) {
    factors.push({
      label: "repair_frequency",
      impact: repairFrequencyPenalty,
      reason: `${repairWorkOrders.length} repair/emergency work orders were completed in 12 months.`,
    });
  }
  const downtimePenalty = Math.min(12, downtimeHoursLast12Months / 8);
  if (downtimePenalty > 0) {
    factors.push({
      label: "downtime_history",
      impact: Number(downtimePenalty.toFixed(2)),
      reason: `${downtimeHoursLast12Months.toFixed(1)} estimated downtime hours were logged in 12 months.`,
    });
  }
  const negativeNotesPenalty = Math.min(8, negativeTechnicianNoteSignals * 0.9);
  if (negativeNotesPenalty > 0) {
    factors.push({
      label: "failure_note_signals",
      impact: Number(negativeNotesPenalty.toFixed(2)),
      reason: `${negativeTechnicianNoteSignals} failure-related note signals were detected.`,
    });
  }
  if (repairVsReplaceRatio != null) {
    const costPenalty =
      repairVsReplaceRatio >= 0.5
        ? 18
        : repairVsReplaceRatio >= 0.35
        ? 12
        : repairVsReplaceRatio >= 0.2
        ? 6
        : 0;
    if (costPenalty > 0) {
      factors.push({
        label: "repair_vs_replace",
        impact: costPenalty,
        reason: `Maintenance cost reached ${(repairVsReplaceRatio * 100).toFixed(
          1
        )}% of replacement value.`,
      });
    }
  }

  const totalPenalty = factors.reduce((sum, factor) => sum + factor.impact, 0);
  const healthScore = clampScore(100 - totalPenalty);
  const ageRiskBoost =
    ageYears != null && expectedLifeYears != null && expectedLifeYears > 0
      ? Math.max(0, (ageYears / expectedLifeYears - 0.8) * 20)
      : 0;
  const failureRisk = clampScore(
    (100 - healthScore) * 0.58 +
      overduePmCount * 4.5 +
      recurringInsights.length * 6 +
      abnormalFrequencyInsights.length * 8 +
      ageRiskBoost
  );
  const healthCategory = toHealthCategory(healthScore);
  const recommendation = recommendationForBreakdown(healthCategory, factors);
  const nowIso = new Date().toISOString();

  await scopedSupabase
    .from("assets")
    .update({
      health_score: healthScore,
      failure_risk: failureRisk,
      maintenance_cost_last_12_months: maintenanceCostLast12Months,
      last_health_calculation: nowIso,
    })
    .eq("id", assetId);

  await scopedSupabase.from("asset_timeline_events").insert({
    tenant_id: tenantId,
    company_id: companyId,
    asset_id: assetId,
    event_type: "health_calculation",
    summary: `Asset health recalculated: ${healthScore.toFixed(1)} (${categoryLabel(
      healthCategory
    )})`,
    details: recommendation,
    source: "system",
    metadata: {
      health_score: healthScore,
      failure_risk: failureRisk,
      factors,
      recurring_patterns: recurringInsights.length,
      abnormal_frequency_patterns: abnormalFrequencyInsights.length,
      maintenance_cost_last_12_months: maintenanceCostLast12Months,
    },
    created_by_user_id: userId,
  });

  await insertActivityLog(scopedSupabase, {
    tenantId,
    companyId,
    entityType: "asset",
    entityId: assetId,
    actionType: "asset_health_recalculated",
    performedBy: userId,
    metadata: {
      health_score: healthScore,
      failure_risk: failureRisk,
      category: healthCategory,
      maintenance_cost_last_12_months: maintenanceCostLast12Months,
    },
  });

  return {
    assetId,
    healthScore,
    failureRisk,
    healthCategory,
    maintenanceCostLast12Months,
    replacementCost,
    expectedLifeYears,
    ageYears,
    remainingLifeYears,
    estimatedReplacementYear,
    repairVsReplaceRatio,
    maintenanceSummary: {
      totalWorkOrdersLast12Months: completedWorkOrders.length,
      repairWorkOrdersLast12Months: repairWorkOrders.length,
      recurringIssueCount: recurringInsights.length,
      overduePmCount,
      downtimeHoursLast12Months: Number(downtimeHoursLast12Months.toFixed(2)),
      negativeTechnicianNoteSignals,
    },
    factors,
    recommendation,
    lastCalculatedAt: nowIso,
  };
}

export async function calculateAssetHealth(assetId: string): Promise<AssetHealthBreakdown> {
  return buildBreakdown(assetId);
}

export async function calculateFailureRisk(assetId: string): Promise<AssetFailureRiskResult> {
  const breakdown = await getAssetHealthBreakdown(assetId);
  return {
    assetId: breakdown.assetId,
    failureRisk: breakdown.failureRisk,
    healthCategory: breakdown.healthCategory,
    riskLabel: toRiskLabel(breakdown.failureRisk),
  };
}

export async function getAssetHealthBreakdown(
  assetId: string
): Promise<AssetHealthBreakdown> {
  const { supabase, asset } = await getAssetIntelligenceContext(assetId);
  const lastCalcRaw = (asset.last_health_calculation as string | null) ?? null;
  const healthScoreRaw = Number((asset.health_score as number | null | undefined) ?? NaN);
  const failureRiskRaw = Number((asset.failure_risk as number | null | undefined) ?? NaN);
  const isStale =
    !lastCalcRaw || Number.isNaN(healthScoreRaw) || new Date(lastCalcRaw) < getStaleCutoff(12);

  if (isStale) {
    return buildBreakdown(assetId, supabase);
  }

  const cachedBreakdownLoader = unstable_cache(
    async () => {
      const { data: latestHealthEvent } = await supabase
        .from("asset_timeline_events")
        .select("metadata, details, event_at")
        .eq("asset_id", assetId)
        .eq("event_type", "health_calculation")
        .order("event_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const metadata = ((latestHealthEvent as { metadata?: Record<string, unknown> | null })?.metadata ??
        null) as Record<string, unknown> | null;
      const factors =
        (metadata?.factors as Array<{ label: string; impact: number; reason: string }> | undefined) ??
        [];

      const maintenanceCostLast12Months =
        Number(
          (asset.maintenance_cost_last_12_months as number | null | undefined) ??
            metadata?.maintenance_cost_last_12_months ??
            0
        ) || 0;
      const replacementCost =
        Number((asset.replacement_cost as number | null | undefined) ?? NaN) || null;
      const expectedLifeYears =
        Number((asset.expected_life_years as number | null | undefined) ?? NaN) || null;
      const installDateRaw = (asset.install_date as string | null) ?? null;
      const ageYears = installDateRaw ? yearsBetween(new Date(installDateRaw), new Date()) : null;
      const remainingLifeYears =
        ageYears != null && expectedLifeYears != null
          ? Number((expectedLifeYears - ageYears).toFixed(2))
          : null;
      const estimatedReplacementYear =
        installDateRaw && expectedLifeYears != null && expectedLifeYears > 0
          ? new Date(installDateRaw).getFullYear() + Math.round(expectedLifeYears)
          : null;
      const repairVsReplaceRatio =
        replacementCost && replacementCost > 0
          ? Number((maintenanceCostLast12Months / replacementCost).toFixed(4))
          : null;

      const recurringIssueCount = Number(metadata?.recurring_patterns ?? 0);
      const overduePmCount = factors.find((factor) => factor.label === "overdue_preventive_maintenance")
        ? 1
        : 0;

      return {
        assetId,
        healthScore: clampScore(healthScoreRaw),
        failureRisk: clampScore(failureRiskRaw),
        healthCategory: toHealthCategory(clampScore(healthScoreRaw)),
        maintenanceCostLast12Months,
        replacementCost,
        expectedLifeYears,
        ageYears,
        remainingLifeYears,
        estimatedReplacementYear,
        repairVsReplaceRatio,
        maintenanceSummary: {
          totalWorkOrdersLast12Months: 0,
          repairWorkOrdersLast12Months: 0,
          recurringIssueCount,
          overduePmCount,
          downtimeHoursLast12Months: 0,
          negativeTechnicianNoteSignals: 0,
        },
        factors,
        recommendation:
          ((latestHealthEvent as { details?: string | null })?.details as string | null) ??
          recommendationForBreakdown(toHealthCategory(clampScore(healthScoreRaw)), factors),
        lastCalculatedAt:
          (lastCalcRaw as string) ??
          ((latestHealthEvent as { event_at?: string | null })?.event_at as string) ??
          new Date().toISOString(),
      } satisfies AssetHealthBreakdown;
    },
    [`asset-health-breakdown-${assetId}`],
    { revalidate: 300, tags: [`asset-health-${assetId}`] }
  );

  return cachedBreakdownLoader();
}
