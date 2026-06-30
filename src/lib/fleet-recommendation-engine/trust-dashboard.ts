import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshRecommendationMeasuredOutcomes } from "@/src/lib/fleet-recommendation-engine/outcome-refresh";
import { attachTrustToHistory } from "@/src/lib/fleet-recommendation-engine/trust-surface";
import type { RecommendationMeasuredImpact } from "@/src/lib/fleet-recommendation-engine/outcome-tracking";
import { loadRecommendationRoiSummary } from "@/src/lib/operational-profitability/performance-reports";
import type {
  FleetRecommendationHistoryEntry,
  FleetRecommendationInstance,
  FleetRecommendationTrustDashboard,
  FleetRecommendationTrustMeasuredSummary,
} from "@/src/types/fleet";

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(n: number, d: number): number | null {
  return d > 0 ? round2((n / d) * 100) : null;
}

function summarizeMeasuredOutcomes(
  history: FleetRecommendationHistoryEntry[]
): FleetRecommendationTrustMeasuredSummary {
  let measuredCount = 0;
  let pendingCount = 0;
  let onTimeCount = 0;
  let onTimeTotal = 0;
  let estimatedContribution = 0;
  let actualContribution = 0;
  let contributionPairs = 0;

  for (const entry of history) {
    const measured = entry.latest_outcome?.measured_impact as RecommendationMeasuredImpact | undefined;
    if (!measured) {
      pendingCount += 1;
      continue;
    }

    const contributionField = measured.actual_contribution;
    if (contributionField.status === "measured") {
      measuredCount += 1;
      if (contributionField.estimated != null) estimatedContribution += contributionField.estimated;
      if (contributionField.actual != null) {
        actualContribution += contributionField.actual;
        contributionPairs += 1;
      }
    } else if (contributionField.status === "pending") {
      pendingCount += 1;
    }

    const onTime = measured.completed_on_time;
    if (onTime.status === "measured" && onTime.actual != null) {
      onTimeTotal += 1;
      if (onTime.actual) onTimeCount += 1;
    }
  }

  const contributionAccuracyPct =
    contributionPairs > 0 && estimatedContribution > 0
      ? round2((actualContribution / estimatedContribution) * 100)
      : null;

  return {
    measuredCount,
    pendingCount,
    contributionAccuracyPct,
    onTimeCompletionRate: onTimeTotal > 0 ? pct(onTimeCount, onTimeTotal) : null,
    totalMeasuredContribution: round2(actualContribution),
    totalEstimatedContribution: round2(estimatedContribution),
  };
}

function computeTrustScore(args: {
  acceptanceRate: number | null;
  measuredSummary: FleetRecommendationTrustMeasuredSummary;
  applicationSuccessRate: number | null;
}): number | null {
  const parts: number[] = [];
  if (args.acceptanceRate != null) parts.push(args.acceptanceRate * 0.35);
  if (args.applicationSuccessRate != null) parts.push(args.applicationSuccessRate * 0.25);
  if (args.measuredSummary.onTimeCompletionRate != null) {
    parts.push(args.measuredSummary.onTimeCompletionRate * 0.2);
  }
  if (args.measuredSummary.contributionAccuracyPct != null) {
    parts.push(Math.min(100, args.measuredSummary.contributionAccuracyPct) * 0.2);
  }
  if (parts.length === 0) return null;
  const weight = 0.35 + 0.25 + 0.2 + 0.2;
  return round2(parts.reduce((sum, v) => sum + v, 0) / weight * (parts.length / 4));
}

async function loadTrustHistory(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { branchId?: string | null; limit?: number }
): Promise<FleetRecommendationHistoryEntry[]> {
  const limit = options?.limit ?? 100;

  let query = supabase
    .from("recommendation_instances")
    .select(
      "id, tenant_id, branch_id, recommendation_type, status, lifecycle, score, rationale, engine_version, created_at, expires_at, recommendation_outcomes(id, recommendation_id, action, acted_by, acted_at, estimated_impact, measured_impact, application_error, notes)"
    )
    .eq("tenant_id", tenantId)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.branchId) query = query.eq("branch_id", options.branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const inst = row as Record<string, unknown>;
    const outcomes = (inst.recommendation_outcomes as Array<Record<string, unknown>> | undefined) ?? [];
    const sorted = [...outcomes].sort(
      (a, b) => Date.parse(String(b.acted_at)) - Date.parse(String(a.acted_at))
    );
    const mapped: FleetRecommendationInstance = {
      id: inst.id as string,
      tenant_id: inst.tenant_id as string,
      branch_id: inst.branch_id as string,
      recommendation_type: inst.recommendation_type as FleetRecommendationInstance["recommendation_type"],
      status: inst.status as FleetRecommendationInstance["status"],
      lifecycle: inst.lifecycle as FleetRecommendationInstance["lifecycle"],
      score: Number(inst.score),
      rationale: inst.rationale as FleetRecommendationInstance["rationale"],
      engine_version: inst.engine_version as string,
      created_at: inst.created_at as string,
      expires_at: inst.expires_at as string,
    };
    const latest = sorted[0];
    return {
      ...mapped,
      latest_outcome: latest
        ? {
            id: latest.id as string,
            recommendation_id: latest.recommendation_id as string,
            action: latest.action as FleetRecommendationHistoryEntry["latest_outcome"] extends infer O
              ? O extends { action: infer A }
                ? A
                : never
              : never,
            acted_by: (latest.acted_by as string | null) ?? null,
            acted_at: latest.acted_at as string,
            estimated_impact: (latest.estimated_impact as Record<string, unknown>) ?? {},
            measured_impact: latest.measured_impact as Record<string, unknown> | undefined,
            application_error: (latest.application_error as string | null) ?? null,
            notes: (latest.notes as string | null) ?? null,
          }
        : null,
    };
  });
}

export async function loadRecommendationTrustDashboard(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { branchId?: string | null; from?: string; to?: string; refreshOutcomes?: boolean }
): Promise<FleetRecommendationTrustDashboard> {
  const range = options?.from && options?.to ? { from: options.from, to: options.to } : defaultDateRange();

  if (options?.refreshOutcomes !== false) {
    await refreshRecommendationMeasuredOutcomes(supabase, tenantId, {
      branchId: options?.branchId,
    });
  }

  const [history, roi] = await Promise.all([
    loadTrustHistory(supabase, tenantId, { branchId: options?.branchId, limit: 100 }),
    loadRecommendationRoiSummary(supabase, tenantId, range.from, range.to),
  ]);

  const historyWithTrust = attachTrustToHistory(history);

  const accepted = historyWithTrust.filter((h) =>
    ["accepted", "applied", "completed"].includes(h.status)
  ).length;
  const rejected = historyWithTrust.filter((h) => h.status === "dismissed").length;
  const expired = historyWithTrust.filter((h) => h.status === "expired").length;
  const applied = historyWithTrust.filter((h) => h.status === "applied" || h.status === "completed").length;
  const failed = historyWithTrust.filter((h) => h.status === "failed").length;
  const completed = historyWithTrust.filter((h) => h.status === "completed").length;
  const generated = historyWithTrust.length;

  const acted = accepted + rejected;
  const measuredSummary = summarizeMeasuredOutcomes(historyWithTrust);

  const applicationAttempts = applied + failed;
  const applicationSuccessRate = pct(applied, applicationAttempts);

  return {
    from: range.from,
    to: range.to,
    totals: {
      generated,
      accepted,
      rejected,
      dismissed: rejected,
      expired,
      applied,
      failed,
      completed,
    },
    rates: {
      acceptanceRate: acted > 0 ? pct(accepted, acted) : null,
      rejectionRate: acted > 0 ? pct(rejected, acted) : null,
      applicationSuccessRate,
    },
    estimatedImpact: roi,
    measuredOutcomes: measuredSummary,
    recentHistory: historyWithTrust.slice(0, 50),
    trustScore: computeTrustScore({
      acceptanceRate: acted > 0 ? pct(accepted, acted) : null,
      measuredSummary,
      applicationSuccessRate,
    }),
  };
}
