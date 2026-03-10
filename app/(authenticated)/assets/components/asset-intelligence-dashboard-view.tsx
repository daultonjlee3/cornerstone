import Link from "next/link";
import { MetricCard } from "@/src/components/ui/metric-card";
import type { AssetIntelligenceDashboard, HealthCategory } from "@/src/lib/assets/intelligence-types";

function categoryLabel(category: HealthCategory): string {
  if (category === "excellent") return "Excellent";
  if (category === "good") return "Good";
  if (category === "warning") return "Warning";
  if (category === "poor") return "Poor";
  return "Critical";
}

function categoryTone(category: HealthCategory): string {
  if (category === "excellent") return "bg-emerald-100 text-emerald-700";
  if (category === "good") return "bg-blue-100 text-blue-700";
  if (category === "warning") return "bg-amber-100 text-amber-700";
  if (category === "poor") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

type AssetIntelligenceDashboardViewProps = {
  data: AssetIntelligenceDashboard;
};

export function AssetIntelligenceDashboardView({ data }: AssetIntelligenceDashboardViewProps) {
  const maxHealthBucket = Math.max(...data.healthDistribution.map((row) => row.count), 1);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Assets"
          value={data.portfolio.totalAssets}
          description="In current tenant scope"
        />
        <MetricCard
          title="PM Compliance Rate"
          value={`${data.portfolio.pmComplianceRate.toFixed(1)}%`}
          description="Active PM plans on schedule"
        />
        <MetricCard
          title="Assets Nearing End of Life"
          value={data.portfolio.assetsNearingEndOfLife}
          description=">= 85% of expected lifecycle"
          className="border-amber-200/80 bg-amber-50/40"
        />
        <MetricCard
          title="High Failure Risk Assets"
          value={data.highFailureRiskAssets.filter((row) => (row.failureRisk ?? 0) >= 70).length}
          description="Risk score >= 70"
          className="border-red-200/80 bg-red-50/40"
        />
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Health Distribution
        </h2>
        <div className="mt-3 space-y-2">
          {data.healthDistribution.map((bucket) => (
            <div key={bucket.category} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${categoryTone(bucket.category)}`}>
                {categoryLabel(bucket.category)}
              </span>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${(bucket.count / maxHealthBucket) * 100}%` }}
                />
              </div>
              <span className="text-right text-sm font-semibold text-[var(--foreground)]">
                {bucket.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            High Failure Risk
          </h2>
          <ul className="mt-3 space-y-2">
            {data.highFailureRiskAssets.slice(0, 8).map((asset) => (
              <li key={asset.id} className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/60 px-3 py-2">
                <Link href={`/assets/${asset.id}`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                  {asset.assetName}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  Risk {(asset.failureRisk ?? 0).toFixed(0)} · Health {(asset.healthScore ?? 0).toFixed(0)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Top Recurring Failures
          </h2>
          <ul className="mt-3 space-y-2">
            {data.recurringIssues.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">No recurring issues detected.</li>
            ) : (
              data.recurringIssues.map((insight) => (
                <li key={`${insight.assetId}-${insight.patternType}`} className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/60 px-3 py-2">
                  <Link href={`/assets/${insight.assetId}`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                    {insight.assetName}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {insight.patternType.replace("recurring_failure:", "").replace(/_/g, " ")} · {insight.frequency}x
                  </p>
                  <p className="text-xs text-[var(--muted)]">{insight.recommendation}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Maintenance Cost Leaderboard
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-2 py-2 font-semibold">Asset</th>
                <th className="px-2 py-2 font-semibold">Maintenance (12m)</th>
                <th className="px-2 py-2 font-semibold">Replacement Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.maintenanceCostLeaderboard.map((row) => (
                <tr key={row.id} className="border-b border-[var(--card-border)] last:border-0">
                  <td className="px-2 py-2">
                    <Link href={`/assets/${row.id}`} className="text-[var(--accent)] hover:underline">
                      {row.assetName}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-[var(--foreground)]">
                    ${row.maintenanceCostLast12Months.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-2 py-2 text-[var(--muted)]">
                    {row.replacementCost != null
                      ? `$${row.replacementCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
