import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/src/lib/auth-context";
import { getTenantAiConfig, getTenantAiUsageSummary, getTenantAiUsageLog } from "@/src/lib/ai/metering";
import { AiUsageForm } from "./ai-usage-form";
import { formatDate } from "@/src/lib/date-utils";

export default async function SettingsAiUsagePage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx.tenantId) redirect("/operations");

  const canAccess = ctx.isPlatformSuperAdmin || ctx.membershipRole === "owner" || ctx.membershipRole === "admin";
  if (!canAccess) redirect("/operations");

  const [config, summary, recentLog] = await Promise.all([
    getTenantAiConfig(ctx.tenantId, supabase),
    getTenantAiUsageSummary(ctx.tenantId, supabase),
    getTenantAiUsageLog(ctx.tenantId, supabase, 50),
  ]);

  const initialForm = {
    aiEnabled: config.aiEnabled,
    monthlyIncludedCostUsd: config.monthlyIncludedCostUsd,
    monthlySoftLimitUsd: config.monthlySoftLimitUsd,
    monthlyHardLimitUsd: config.monthlyHardLimitUsd,
    warningThresholdPercent: config.warningThresholdPercent,
    overagePolicy: config.overagePolicy,
    lightModelOnlyOverSoftLimit: config.lightModelOnlyOverSoftLimit,
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Current month usage
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-[var(--muted)]">Usage (USD)</dt>
            <dd className="text-lg font-semibold text-[var(--foreground)]">
              ${summary.currentMonthUsageUsd.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Credits used</dt>
            <dd className="text-lg font-semibold text-[var(--foreground)]">
              {summary.currentMonthCreditsUsed.toFixed(0)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Remaining budget (USD)</dt>
            <dd className="text-lg font-semibold text-[var(--foreground)]">
              ${summary.remainingBudgetUsd.toFixed(4)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Remaining credits</dt>
            <dd className="text-lg font-semibold text-[var(--foreground)]">
              {summary.remainingCredits.toFixed(0)}
            </dd>
          </div>
        </dl>
        {(summary.softLimitReached || summary.hardLimitReached) && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            {summary.hardLimitReached
              ? "Hard limit reached. AI requests will be blocked or degraded per policy."
              : "Soft limit reached. Some requests may use light mode only."}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          AI quota settings
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Set monthly limits and overage behavior. Cost is in USD; credits are shown in the UI for display.
        </p>
        <AiUsageForm initial={initialForm} />
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Recent usage
        </h2>
        {recentLog.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No AI usage recorded yet this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-xs uppercase text-[var(--muted)]">
                  <th className="py-2 pr-4">Feature</th>
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">Cost (USD)</th>
                  <th className="py-2 pr-4">Credits</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentLog.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="py-2 pr-4">{row.featureKey}</td>
                    <td className="py-2 pr-4">{row.provider}/{row.model}</td>
                    <td className="py-2 pr-4">{row.mode}</td>
                    <td className="py-2 pr-4">{row.estimatedTotalCostUsd.toFixed(6)}</td>
                    <td className="py-2 pr-4">{row.creditsUsed.toFixed(0)}</td>
                    <td className="py-2 pr-4">{row.status}</td>
                    <td className="py-2 text-[var(--muted)]">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
