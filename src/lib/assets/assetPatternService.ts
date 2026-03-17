import type { SupabaseClient } from "@supabase/supabase-js";
import { getAssetIntelligenceContext } from "./asset-intelligence-context";
import type { AssetInsightSeverity } from "./intelligence-types";

export type AssetPatternInsight = {
  pattern_type: string;
  frequency: number;
  recommendation: string;
  severity: AssetInsightSeverity;
  metadata: Record<string, unknown>;
};

const ISSUE_KEYWORDS: Array<{ key: string; matches: string[] }> = [
  { key: "compressor", matches: ["compressor"] },
  { key: "belt", matches: ["belt"] },
  { key: "electrical", matches: ["electrical", "voltage", "breaker", "reset"] },
  { key: "motor", matches: ["motor"] },
  { key: "pump", matches: ["pump"] },
  { key: "leak", matches: ["leak", "refrigerant"] },
  { key: "filter", matches: ["filter"] },
];

function severityForFrequency(frequency: number): AssetInsightSeverity {
  if (frequency >= 5) return "critical";
  if (frequency >= 4) return "high";
  if (frequency >= 3) return "medium";
  return "low";
}

function inferIssueKey(workOrder: Record<string, unknown>): string {
  const text = [
    workOrder.title,
    workOrder.root_cause,
    workOrder.completion_notes,
    workOrder.resolution_summary,
    workOrder.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const keyword of ISSUE_KEYWORDS) {
    if (keyword.matches.some((token) => text.includes(token))) return keyword.key;
  }
  return ((workOrder.category as string | null) ?? "general").toLowerCase();
}

async function persistPatternGroup(
  supabase: SupabaseClient,
  {
    tenantId,
    companyId,
    assetId,
    groupPrefix,
    insights,
  }: {
    tenantId: string;
    companyId: string;
    assetId: string;
    groupPrefix: string;
    insights: AssetPatternInsight[];
  }
) {
  const nowIso = new Date().toISOString();
  await supabase
    .from("asset_insights")
    .update({ is_active: false, last_seen_at: nowIso, updated_at: nowIso })
    .eq("asset_id", assetId)
    .eq("source", "rule_engine")
    .eq("is_active", true)
    .ilike("pattern_type", `${groupPrefix}%`);

  if (insights.length === 0) return;

  const rows = insights.map((insight) => ({
    tenant_id: tenantId,
    company_id: companyId,
    asset_id: assetId,
    pattern_type: insight.pattern_type,
    frequency: insight.frequency,
    recommendation: insight.recommendation,
    severity: insight.severity,
    metadata: insight.metadata,
    source: "rule_engine",
    detected_at: nowIso,
    last_seen_at: nowIso,
    is_active: true,
    updated_at: nowIso,
  }));
  await supabase.from("asset_insights").insert(rows);
}

export async function detectRecurringFailures(
  assetId: string,
  options?: { persist?: boolean; supabase?: SupabaseClient }
): Promise<AssetPatternInsight[]> {
  const { supabase, tenantId, companyId } = await getAssetIntelligenceContext(
    assetId,
    options?.supabase
  );

  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - 12);
  const { data: completedRows } = await supabase
    .from("work_orders")
    .select(
      "id, title, category, root_cause, completion_notes, resolution_summary, completion_status, completed_at"
    )
    .eq("asset_id", assetId)
    .eq("status", "completed")
    .gte("completed_at", windowStart.toISOString())
    .order("completed_at", { ascending: false });

  const issueCounts = new Map<
    string,
    { count: number; latestCompletedAt: string | null; workOrderIds: string[] }
  >();
  for (const row of completedRows ?? []) {
    const workOrder = row as Record<string, unknown>;
    const issueKey = inferIssueKey(workOrder);
    const existing = issueCounts.get(issueKey) ?? {
      count: 0,
      latestCompletedAt: null,
      workOrderIds: [],
    };
    existing.count += 1;
    existing.latestCompletedAt =
      (workOrder.completed_at as string | null) ?? existing.latestCompletedAt;
    if (workOrder.id) existing.workOrderIds.push(workOrder.id as string);
    issueCounts.set(issueKey, existing);
  }

  const recurringInsights = [...issueCounts.entries()]
    .filter(([, value]) => value.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([issueKey, value]) => ({
      pattern_type: `recurring_failure:${issueKey}`,
      frequency: value.count,
      recommendation: `${issueKey
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())} failures detected ${
        value.count
      } times in the last 12 months. Consider replacement planning or root cause elimination.`,
      severity: severityForFrequency(value.count),
      metadata: {
        issue_key: issueKey,
        latest_completed_at: value.latestCompletedAt,
        related_work_order_ids: value.workOrderIds.slice(0, 8),
      },
    }));

  if (options?.persist !== false) {
    await persistPatternGroup(supabase, {
      tenantId,
      companyId,
      assetId,
      groupPrefix: "recurring_failure:",
      insights: recurringInsights,
    });
  }

  return recurringInsights;
}

export async function detectAbnormalRepairFrequency(
  assetId: string,
  options?: { persist?: boolean; supabase?: SupabaseClient }
): Promise<AssetPatternInsight[]> {
  const { supabase, tenantId, companyId } = await getAssetIntelligenceContext(
    assetId,
    options?.supabase
  );

  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const oneEightyDaysAgo = new Date(now);
  oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

  const { data: recentRows } = await supabase
    .from("work_orders")
    .select("id, completed_at, category, priority")
    .eq("asset_id", assetId)
    .eq("status", "completed")
    .gte("completed_at", oneEightyDaysAgo.toISOString())
    .in("category", ["repair", "emergency"])
    .order("completed_at", { ascending: false });

  const currentWindowRows = (recentRows ?? []).filter((row) => {
    const completedAt = (row as { completed_at?: string | null }).completed_at;
    return Boolean(completedAt && new Date(completedAt) >= ninetyDaysAgo);
  });
  const previousWindowRows = (recentRows ?? []).filter((row) => {
    const completedAt = (row as { completed_at?: string | null }).completed_at;
    if (!completedAt) return false;
    const dt = new Date(completedAt);
    return dt < ninetyDaysAgo && dt >= oneEightyDaysAgo;
  });

  const currentCount = currentWindowRows.length;
  const previousCount = previousWindowRows.length;
  const increaseRatio = previousCount > 0 ? currentCount / previousCount : currentCount;
  const insights: AssetPatternInsight[] = [];

  if (currentCount >= 3 && increaseRatio >= 1.5) {
    const severity: AssetInsightSeverity =
      currentCount >= 6 || increaseRatio >= 2.5
        ? "critical"
        : currentCount >= 4
        ? "high"
        : "medium";
    insights.push({
      pattern_type: "abnormal_repair_frequency",
      frequency: currentCount,
      recommendation: `Repair frequency increased from ${previousCount} to ${currentCount} in the last 90-day window. Review replacement timing and escalate proactive maintenance.`,
      severity,
      metadata: {
        current_window_repairs: currentCount,
        previous_window_repairs: previousCount,
        increase_ratio: Number(increaseRatio.toFixed(2)),
      },
    });
  }

  if (options?.persist !== false) {
    await persistPatternGroup(supabase, {
      tenantId,
      companyId,
      assetId,
      groupPrefix: "abnormal_repair_frequency",
      insights,
    });
  }

  return insights;
}
