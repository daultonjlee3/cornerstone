"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import {
  getTenantAiConfig,
  getTenantAiUsageSummary,
} from "@/src/lib/ai/metering";
import type { OveragePolicy } from "@/src/lib/ai/types";

export type TenantAiAllowanceSummary = {
  config: {
    aiEnabled: boolean;
    monthlyIncludedCostUsd: number;
    monthlySoftLimitUsd: number;
    monthlyHardLimitUsd: number;
    warningThresholdPercent: number;
    overagePolicy: OveragePolicy;
  };
  usage: {
    currentMonthUsageUsd: number;
    remainingBudgetUsd: number;
    usagePercent: number;
    status: "healthy" | "nearing_limit" | "at_limit";
  };
};

export type TenantAiAllowanceForm = {
  aiEnabled: boolean;
  monthlyIncludedCostUsd: number;
  monthlySoftLimitUsd: number;
  monthlyHardLimitUsd: number;
  warningThresholdPercent: number;
  overagePolicy: OveragePolicy;
};

function assertPlatformAdmin(auth: Awaited<ReturnType<typeof getAuthContext>>) {
  const canAdmin =
    auth.isPlatformSuperAdmin ||
    auth.membershipRole === "owner" ||
    auth.membershipRole === "admin";
  if (!canAdmin) throw new Error("Forbidden");
}

function deriveStatus(
  usageUsd: number,
  hardLimitUsd: number,
  warningThresholdPercent: number
): "healthy" | "nearing_limit" | "at_limit" {
  if (hardLimitUsd <= 0) return "healthy";
  if (usageUsd >= hardLimitUsd) return "at_limit";
  const warnAt = (warningThresholdPercent / 100) * hardLimitUsd;
  if (usageUsd >= warnAt) return "nearing_limit";
  return "healthy";
}

export async function getTenantAiAllowance(
  tenantId: string
): Promise<TenantAiAllowanceSummary> {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  assertPlatformAdmin(ctx);

  const [config, usageSummary] = await Promise.all([
    getTenantAiConfig(tenantId, supabase),
    getTenantAiUsageSummary(tenantId, supabase),
  ]);

  const usageUsd = usageSummary.currentMonthUsageUsd ?? 0;
  const hard = config.monthlyHardLimitUsd || 0;
  const usagePercent =
    hard > 0 ? Math.min(100, Math.round((usageUsd / hard) * 100)) : 0;
  const status = deriveStatus(
    usageUsd,
    hard,
    config.warningThresholdPercent ?? 80
  );

  return {
    config: {
      aiEnabled: config.aiEnabled,
      monthlyIncludedCostUsd: config.monthlyIncludedCostUsd,
      monthlySoftLimitUsd: config.monthlySoftLimitUsd,
      monthlyHardLimitUsd: config.monthlyHardLimitUsd,
      warningThresholdPercent: config.warningThresholdPercent,
      overagePolicy: config.overagePolicy,
    },
    usage: {
      currentMonthUsageUsd: usageUsd,
      remainingBudgetUsd: usageSummary.remainingBudgetUsd,
      usagePercent,
      status,
    },
  };
}

function validateForm(input: TenantAiAllowanceForm): string | null {
  const {
    monthlyIncludedCostUsd,
    monthlySoftLimitUsd,
    monthlyHardLimitUsd,
    warningThresholdPercent,
  } = input;

  if (
    monthlyIncludedCostUsd < 0 ||
    monthlySoftLimitUsd < 0 ||
    monthlyHardLimitUsd < 0
  ) {
    return "Limits cannot be negative.";
  }
  if (monthlySoftLimitUsd > monthlyHardLimitUsd) {
    return "Soft limit must be less than or equal to the hard limit.";
  }
  if (warningThresholdPercent < 1 || warningThresholdPercent > 100) {
    return "Warning threshold must be between 1 and 100.";
  }
  return null;
}

export async function saveTenantAiAllowance(
  tenantId: string,
  form: TenantAiAllowanceForm
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  assertPlatformAdmin(ctx);

  const err = validateForm(form);
  if (err) return { error: err };

  const { error } = await supabase.from("tenant_ai_config").upsert(
    {
      tenant_id: tenantId,
      ai_enabled: form.aiEnabled,
      monthly_included_cost_usd: form.monthlyIncludedCostUsd,
      monthly_soft_limit_usd: form.monthlySoftLimitUsd,
      monthly_hard_limit_usd: form.monthlyHardLimitUsd,
      warning_threshold_percent: form.warningThresholdPercent,
      overage_policy: form.overagePolicy,
      light_model_only_over_soft_limit: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" }
  );

  if (error) return { error: error.message };
  return {};
}

