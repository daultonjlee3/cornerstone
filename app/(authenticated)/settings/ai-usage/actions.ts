"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import {
  getTenantAiConfig,
  getTenantAiUsageSummary,
  getTenantAiUsageLog,
} from "@/src/lib/ai/metering";
import type { OveragePolicy } from "@/src/lib/ai/types";

export type TenantAiConfigForm = {
  aiEnabled: boolean;
  monthlyIncludedCostUsd: number;
  monthlySoftLimitUsd: number;
  monthlyHardLimitUsd: number;
  warningThresholdPercent: number;
  overagePolicy: OveragePolicy;
  lightModelOnlyOverSoftLimit: boolean;
};

function validateConfig(form: TenantAiConfigForm): string | null {
  if (form.monthlyIncludedCostUsd < 0 || form.monthlySoftLimitUsd < 0 || form.monthlyHardLimitUsd < 0) {
    return "Limits cannot be negative.";
  }
  if (form.monthlySoftLimitUsd < form.monthlyIncludedCostUsd) {
    return "Soft limit must be at least the included budget.";
  }
  if (form.monthlyHardLimitUsd < form.monthlySoftLimitUsd) {
    return "Hard limit must be at least the soft limit.";
  }
  if (form.warningThresholdPercent < 1 || form.warningThresholdPercent > 99) {
    return "Warning threshold must be between 1 and 99.";
  }
  return null;
}

export async function getAiUsagePageData(): Promise<{
  summary?: Awaited<ReturnType<typeof getTenantAiUsageSummary>>;
  recentLog?: Awaited<ReturnType<typeof getTenantAiUsageLog>>;
  error?: string;
}> {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx.tenantId) return { error: "Unauthorized" };

  const [summary, recentLog] = await Promise.all([
    getTenantAiUsageSummary(ctx.tenantId, supabase),
    getTenantAiUsageLog(ctx.tenantId, supabase, 50),
  ]);
  return { summary, recentLog };
}

export async function saveTenantAiConfig(form: TenantAiConfigForm): Promise<{ error?: string }> {
  const err = validateConfig(form);
  if (err) return { error: err };

  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx.tenantId) return { error: "Unauthorized" };
  const canAccess = ctx.isPlatformSuperAdmin || ctx.membershipRole === "owner" || ctx.membershipRole === "admin";
  if (!canAccess) return { error: "Forbidden" };

  const { error } = await supabase.from("tenant_ai_config").upsert(
    {
      tenant_id: ctx.tenantId,
      ai_enabled: form.aiEnabled,
      monthly_included_cost_usd: form.monthlyIncludedCostUsd,
      monthly_soft_limit_usd: form.monthlySoftLimitUsd,
      monthly_hard_limit_usd: form.monthlyHardLimitUsd,
      warning_threshold_percent: form.warningThresholdPercent,
      overage_policy: form.overagePolicy,
      light_model_only_over_soft_limit: form.lightModelOnlyOverSoftLimit,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" }
  );

  if (error) return { error: error.message };
  return {};
}
