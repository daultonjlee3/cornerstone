/**
 * Server-side AI usage metering: tenant config, monthly usage, quota check, and recording.
 * Use checkAiQuotaBeforeRequest before any AI call; recordAiUsage after.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateRequestCostUsd } from "./pricing";
import { costUsdToCredits } from "./credits";
import type {
  TenantAiConfig,
  AiQuotaDecision,
  RecordAiUsageInput,
  OveragePolicy,
  AiUsageMode,
} from "./types";

const DEFAULT_CONFIG: Omit<TenantAiConfig, "id" | "tenantId" | "createdAt" | "updatedAt"> = {
  aiEnabled: true,
  monthlyIncludedCostUsd: 20,
  monthlySoftLimitUsd: 20,
  monthlyHardLimitUsd: 25,
  warningThresholdPercent: 80,
  overagePolicy: "DEGRADE_TO_LIGHT",
  lightModelOnlyOverSoftLimit: true,
  includedCreditsMonthly: null,
};

function rowToConfig(row: Record<string, unknown>): TenantAiConfig {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    aiEnabled: Boolean(row.ai_enabled),
    monthlyIncludedCostUsd: Number(row.monthly_included_cost_usd ?? 0),
    monthlySoftLimitUsd: Number(row.monthly_soft_limit_usd ?? 0),
    monthlyHardLimitUsd: Number(row.monthly_hard_limit_usd ?? 0),
    warningThresholdPercent: Number(row.warning_threshold_percent ?? 80),
    overagePolicy: (row.overage_policy as OveragePolicy) ?? "DEGRADE_TO_LIGHT",
    lightModelOnlyOverSoftLimit: Boolean(row.light_model_only_over_soft_limit ?? true),
    includedCreditsMonthly: row.included_credits_monthly != null ? Number(row.included_credits_monthly) : null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Get tenant AI config. Returns DB row or safe defaults (no row = defaults).
 */
export async function getTenantAiConfig(
  tenantId: string,
  supabase: SupabaseClient
): Promise<TenantAiConfig> {
  const { data } = await supabase
    .from("tenant_ai_config")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data) {
    const now = new Date().toISOString();
    return {
      id: "",
      tenantId,
      ...DEFAULT_CONFIG,
      createdAt: now,
      updatedAt: now,
    };
  }
  return rowToConfig(data as Record<string, unknown>);
}

/**
 * Current month window (UTC) for usage aggregation.
 */
export function getCurrentMonthWindow(): { start: string; end: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)).toISOString();
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)).toISOString();
  return { start, end };
}

/**
 * Sum of estimated_total_cost_usd for the tenant in the given month window.
 */
export async function getCurrentMonthlyAiUsage(
  tenantId: string,
  supabase: SupabaseClient,
  monthWindow?: { start: string; end: string }
): Promise<number> {
  const { start, end } = monthWindow ?? getCurrentMonthWindow();
  const { data } = await supabase
    .from("ai_usage_log")
    .select("estimated_total_cost_usd")
    .eq("tenant_id", tenantId)
    .gte("created_at", start)
    .lte("created_at", end);

  const rows = (data ?? []) as { estimated_total_cost_usd?: number | string }[];
  let sum = 0;
  for (const r of rows) {
    const v = r.estimated_total_cost_usd;
    sum += typeof v === "number" ? v : Number(v ?? 0);
  }
  return sum;
}

/**
 * Estimate cost for a single request (uses centralized pricing).
 */
export function estimateAiRequestCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens?: number
): number {
  return estimateRequestCostUsd(provider, model, inputTokens, outputTokens, cachedTokens);
}

/**
 * Pure quota decision from config + current usage + estimated cost. Used by checkAiQuotaBeforeRequest; exported for tests.
 */
export function computeQuotaDecision(
  config: TenantAiConfig,
  currentUsageUsd: number,
  estimatedCostUsd: number,
  requestedMode: AiUsageMode
): AiQuotaDecision {
  if (!config.aiEnabled) {
    return {
      allowed: false,
      mode: "BLOCKED",
      reason: "AI is disabled for this organization.",
      warning: null,
      softLimitReached: false,
      hardLimitReached: true,
      remainingEstimatedBudgetUsd: 0,
      remainingCredits: 0,
      uiMessage: "Monthly AI limit reached",
    };
  }

  const hardLimit = config.monthlyHardLimitUsd;
  const softLimit = config.monthlySoftLimitUsd;
  const projectedTotal = currentUsageUsd + estimatedCostUsd;
  const softLimitReached = currentUsageUsd >= softLimit || projectedTotal >= softLimit;
  const hardLimitReached = currentUsageUsd >= hardLimit || projectedTotal >= hardLimit;
  const warningThreshold = (config.warningThresholdPercent / 100) * hardLimit;
  const nearLimit = currentUsageUsd >= warningThreshold || projectedTotal >= warningThreshold;

  const remainingUsd = Math.max(0, hardLimit - currentUsageUsd);
  const remainingCredits = costUsdToCredits(remainingUsd);

  let allowed: boolean;
  let mode: "FULL" | "LIGHT" | "BLOCKED";
  let reason: string;
  let uiMessage: string | null = null;

  if (hardLimitReached && config.overagePolicy === "BLOCK") {
    allowed = false;
    mode = "BLOCKED";
    reason = "Monthly AI hard limit reached.";
    uiMessage = "Monthly AI limit reached";
  } else if (hardLimitReached && requestedMode === "LIGHT" && config.lightModelOnlyOverSoftLimit) {
    allowed = false;
    mode = "BLOCKED";
    reason = "Hard limit reached; light mode already in use.";
    uiMessage = "Monthly AI limit reached";
  } else if (hardLimitReached) {
    allowed = config.overagePolicy !== "BLOCK";
    mode = allowed && config.overagePolicy === "DEGRADE_TO_LIGHT" ? "LIGHT" : "BLOCKED";
    reason = allowed ? "Over hard limit; degraded to light mode." : "Monthly AI hard limit reached.";
    uiMessage = allowed ? "Light mode active for the rest of the month" : "Monthly AI limit reached";
  } else if (softLimitReached && config.lightModelOnlyOverSoftLimit && requestedMode === "FULL") {
    allowed = true;
    mode = "LIGHT";
    reason = "Over soft limit; using light mode only.";
    uiMessage = "AI usage nearing monthly limit";
  } else if (softLimitReached && config.overagePolicy === "DEGRADE_TO_LIGHT" && requestedMode === "FULL") {
    allowed = true;
    mode = "LIGHT";
    reason = "Over soft limit; degraded to light mode.";
    uiMessage = "AI usage nearing monthly limit";
  } else if (softLimitReached && config.overagePolicy === "ALLOW_FULL") {
    allowed = true;
    mode = requestedMode as "FULL" | "LIGHT";
    reason = "Over soft limit; full access allowed by policy.";
    uiMessage = "AI usage nearing monthly limit";
  } else {
    allowed = true;
    mode = requestedMode as "FULL" | "LIGHT";
    reason = "Within limits.";
    uiMessage = nearLimit ? "AI usage nearing monthly limit" : null;
  }

  return {
    allowed,
    mode,
    reason,
    warning: nearLimit ? "Approaching monthly AI limit." : null,
    softLimitReached,
    hardLimitReached,
    remainingEstimatedBudgetUsd: remainingUsd,
    remainingCredits,
    uiMessage,
  };
}

/**
 * Check quota before making an AI request. Returns decision (allowed, mode, warnings, etc.).
 */
export async function checkAiQuotaBeforeRequest(
  tenantId: string,
  supabase: SupabaseClient,
  options: {
    requestedMode?: AiUsageMode;
    estimatedCostUsd?: number;
    provider?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
    featureKey?: string;
  }
): Promise<AiQuotaDecision> {
  const config = await getTenantAiConfig(tenantId, supabase);
  const usage = await getCurrentMonthlyAiUsage(tenantId, supabase);

  let estimatedCost = options.estimatedCostUsd ?? 0;
  if (estimatedCost <= 0 && options.provider && options.model && options.inputTokens != null && options.outputTokens != null) {
    estimatedCost = estimateAiRequestCost(
      options.provider,
      options.model,
      options.inputTokens,
      options.outputTokens,
      options.cachedTokens
    );
  }

  return computeQuotaDecision(config, usage, estimatedCost, options.requestedMode ?? "FULL");
}

/**
 * Record AI usage after a request. Idempotent when requestId is provided (unique constraint).
 */
export async function recordAiUsage(
  supabase: SupabaseClient,
  input: RecordAiUsageInput
): Promise<{ id?: string; error?: string }> {
  const total = input.inputTokens + input.outputTokens;
  const inputCost = total > 0 ? (input.estimatedTotalCostUsd * input.inputTokens) / total : 0;
  const outputCost = input.estimatedTotalCostUsd - inputCost;

  const row = {
    tenant_id: input.tenantId,
    user_id: input.userId ?? null,
    feature_key: input.featureKey,
    request_id: input.requestId ?? null,
    trace_id: input.traceId ?? null,
    provider: input.provider,
    model: input.model,
    mode: input.mode,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    cached_tokens: input.cachedTokens ?? null,
    estimated_input_cost_usd: inputCost,
    estimated_output_cost_usd: outputCost,
    estimated_total_cost_usd: input.estimatedTotalCostUsd,
    credits_used: input.creditsUsed,
    status: input.status,
    block_reason: input.blockReason ?? null,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase.from("ai_usage_log").insert(row).select("id").single();

  if (error) {
    if (input.requestId && error.code === "23505") {
      return { id: undefined };
    }
    return { error: error.message };
  }
  return { id: (data as { id?: string })?.id };
}

/**
 * Resolve execution mode from decision: FULL, LIGHT, or throw if BLOCKED.
 */
export function resolveAiExecutionMode(decision: AiQuotaDecision): AiUsageMode {
  if (decision.mode === "BLOCKED") {
    throw new Error(decision.reason || "AI request blocked by quota.");
  }
  return decision.mode;
}

/**
 * Summary for admin UI: config + current month usage + remaining.
 */
export async function getTenantAiUsageSummary(
  tenantId: string,
  supabase: SupabaseClient
): Promise<{
  config: TenantAiConfig;
  currentMonthUsageUsd: number;
  currentMonthCreditsUsed: number;
  remainingBudgetUsd: number;
  remainingCredits: number;
  softLimitReached: boolean;
  hardLimitReached: boolean;
}> {
  const config = await getTenantAiConfig(tenantId, supabase);
  const usage = await getCurrentMonthlyAiUsage(tenantId, supabase);
  const creditsUsed = costUsdToCredits(usage);
  const remainingUsd = Math.max(0, config.monthlyHardLimitUsd - usage);
  const remainingCredits = costUsdToCredits(remainingUsd);
  return {
    config,
    currentMonthUsageUsd: usage,
    currentMonthCreditsUsed: creditsUsed,
    remainingBudgetUsd: remainingUsd,
    remainingCredits,
    softLimitReached: usage >= config.monthlySoftLimitUsd,
    hardLimitReached: usage >= config.monthlyHardLimitUsd,
  };
}

/**
 * Recent usage log entries for admin UI (e.g. last 50).
 */
export async function getTenantAiUsageLog(
  tenantId: string,
  supabase: SupabaseClient,
  limit = 50
): Promise<{
  id: string;
  featureKey: string;
  provider: string;
  model: string;
  mode: string;
  estimatedTotalCostUsd: number;
  creditsUsed: number;
  status: string;
  createdAt: string;
}[]> {
  const { data } = await supabase
    .from("ai_usage_log")
    .select("id, feature_key, provider, model, mode, estimated_total_cost_usd, credits_used, status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    featureKey: (r.feature_key as string) ?? "",
    provider: (r.provider as string) ?? "",
    model: (r.model as string) ?? "",
    mode: (r.mode as string) ?? "FULL",
    estimatedTotalCostUsd: Number(r.estimated_total_cost_usd ?? 0),
    creditsUsed: Number(r.credits_used ?? 0),
    status: (r.status as string) ?? "SUCCESS",
    createdAt: (r.created_at as string) ?? "",
  }));
}
