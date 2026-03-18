/**
 * Types for AI metering: config, usage log, and enforcement result.
 */

export type OveragePolicy = "ALLOW_FULL" | "DEGRADE_TO_LIGHT" | "BLOCK";
export type AiUsageMode = "FULL" | "LIGHT";
export type AiUsageStatus = "SUCCESS" | "BLOCKED" | "DEGRADED" | "ERROR";

export type TenantAiConfig = {
  id: string;
  tenantId: string;
  aiEnabled: boolean;
  monthlyIncludedCostUsd: number;
  monthlySoftLimitUsd: number;
  monthlyHardLimitUsd: number;
  warningThresholdPercent: number;
  overagePolicy: OveragePolicy;
  lightModelOnlyOverSoftLimit: boolean;
  includedCreditsMonthly: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AiUsageLogEntry = {
  id: string;
  tenantId: string;
  userId: string | null;
  featureKey: string;
  requestId: string | null;
  traceId: string | null;
  provider: string;
  model: string;
  mode: AiUsageMode;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number | null;
  estimatedInputCostUsd: number;
  estimatedOutputCostUsd: number;
  estimatedTotalCostUsd: number;
  creditsUsed: number;
  status: AiUsageStatus;
  blockReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

/** Result of quota check: whether to allow, in which mode, and metadata for UI. */
export type AiQuotaDecision = {
  allowed: boolean;
  mode: "FULL" | "LIGHT" | "BLOCKED";
  reason: string;
  warning: string | null;
  softLimitReached: boolean;
  hardLimitReached: boolean;
  remainingEstimatedBudgetUsd: number;
  remainingCredits: number;
  uiMessage: string | null;
};

/** Input for recording usage after a request. */
export type RecordAiUsageInput = {
  tenantId: string;
  userId?: string | null;
  featureKey: string;
  requestId?: string | null;
  traceId?: string | null;
  provider: string;
  model: string;
  mode: AiUsageMode;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number | null;
  estimatedTotalCostUsd: number;
  creditsUsed: number;
  status: AiUsageStatus;
  blockReason?: string | null;
  metadata?: Record<string, unknown>;
};
