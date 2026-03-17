import Link from "next/link";
import { Package, Percent, AlertTriangle, AlertOctagon } from "lucide-react";
import { MetricCard } from "@/src/components/ui/metric-card";
import type {
  AssetInsightSeverity,
  AssetIntelligenceDashboard,
  HealthCategory,
} from "@/src/lib/assets/intelligence-types";

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

function severityTone(severity: AssetInsightSeverity): string {
  if (severity === "critical") return "border-red-300 bg-red-50 text-red-700";
  if (severity === "high") return "border-orange-300 bg-orange-50 text-orange-700";
  if (severity === "medium") return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-blue-300 bg-blue-50 text-blue-700";
}

function severityLabel(severity: AssetInsightSeverity): string {
  if (severity === "critical") return "Critical";
  if (severity === "high") return "High";
  if (severity === "medium") return "Medium";
  return "Low";
}

type AssetIntelligenceDashboardViewProps = {
  data: AssetIntelligenceDashboard;
  selectedCompanyId?: string | null;
};

export function AssetIntelligenceDashboardView({
  data,
  selectedCompanyId = null,
}: AssetIntelligenceDashboardViewProps) {
  const maxHealthBucket = Math.max(...data.healthDistribution.map((row) => row.count), 1);
  const companyQuery = selectedCompanyId ? `&company_id=${selectedCompanyId}` : "";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Asset Intelligence Insights
          </h2>
          <span className="text-xs text-[var(--muted)]">Top 5 by severity</span>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {data.topInsights.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No high-priority insights right now. Asset intelligence is actively monitoring.
            </p>
          ) : (
            data.topInsights.slice(0, 5).map((insight) => (
              <article
                key={insight.id}
                className={`rounded-lg border p-3 ${severityTone(insight.severity)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {severityLabel(insight.severity)} · {insight.title}
                </p>
                <Link
                  href={`/assets/${insight.assetId}`}
                  className="mt-1 block text-sm font-semibold hover:underline"
                >
                  {insight.assetName}
                </Link>
                <p className="mt-1 text-xs">{insight.description}</p>
                <p className="mt-2 text-xs font-medium">Recommendation: {insight.recommendation}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Assets"
          value={data.portfolio.totalAssets}
          description="In current tenant scope"
          icon={Package}
        />
        <MetricCard
          title="PM Compliance Rate"
          value={`${data.portfolio.pmComplianceRate.toFixed(1)}%`}
          description="Active PM plans on schedule"
          icon={Percent}
        />
        <MetricCard
          title="Assets Nearing End of Life"
          value={data.portfolio.assetsNearingEndOfLife}
          description=">= 85% of expected lifecycle"
          className="border-amber-200/80 bg-amber-50/40"
          icon={AlertTriangle}
        />
        <MetricCard
          title="High Failure Risk Assets"
          value={data.highFailureRiskAssets.filter((row) => (row.failureRisk ?? 0) >= 70).length}
          description="Risk score >= 70"
          className="border-red-200/80 bg-red-50/40"
          icon={AlertOctagon}
        />
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Health Distribution
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Click a category to open the filtered asset list.
        </p>
        <div className="mt-3 space-y-2">
          {data.healthDistribution.map((bucket) => (
            <Link
              key={bucket.category}
              href={`/assets?health_status=${bucket.category}${companyQuery}`}
              className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-2 rounded-md px-1 py-1 hover:bg-[var(--background)]/60"
            >
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
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            High Failure Risk
          </h2>
          <ul className="mt-3 space-y-2">
            {data.highFailureRiskAssets.slice(0, 5).map((asset) => (
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
            {data.failurePatterns.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">No recurring issues detected.</li>
            ) : (
              data.failurePatterns.map((pattern) => (
                <li
                  key={pattern.patternKey}
                  className={`rounded-lg border px-3 py-2 ${severityTone(pattern.severity)}`}
                >
                  <p className="text-sm font-semibold">
                    {pattern.label} - {pattern.occurrences} occurrences
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {pattern.affectedAssets} asset(s) affected
                  </p>
                  <p className="text-xs text-[var(--muted)]">{pattern.recommendation}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Replacement Candidates
        </h2>
        <ul className="mt-3 space-y-2">
          {data.replacementCandidates.length === 0 ? (
            <li className="text-sm text-[var(--muted)]">No replacement candidates detected.</li>
          ) : (
            data.replacementCandidates.map((asset) => (
              <li
                key={asset.id}
                className={`rounded-lg border p-3 ${severityTone(asset.severity)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/assets/${asset.id}`} className="text-sm font-semibold hover:underline">
                    {asset.assetName}
                  </Link>
                  <span className="text-xs font-semibold">
                    {asset.maintenancePercentOfReplacement != null
                      ? `${asset.maintenancePercentOfReplacement.toFixed(1)}% of replacement`
                      : "Replacement cost missing"}
                  </span>
                </div>
                <p className="mt-1 text-xs">
                  Age {asset.ageYears?.toFixed(1) ?? "—"} / {asset.expectedLifeYears?.toFixed(1) ?? "—"} yrs ·
                  Health {asset.healthScore?.toFixed(0) ?? "—"} · Risk {asset.failureRisk?.toFixed(0) ?? "—"}
                </p>
                <p className="mt-1 text-xs">{asset.recommendation}</p>
              </li>
            ))
          )}
        </ul>
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
                <th className="px-2 py-2 font-semibold">Maintenance %</th>
                <th className="px-2 py-2 font-semibold">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {data.maintenanceCostLeaderboard.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[var(--card-border)] last:border-0 ${
                    row.severity === "critical"
                      ? "bg-red-50/50"
                      : row.severity === "high"
                      ? "bg-orange-50/50"
                      : ""
                  }`}
                >
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
                  <td className="px-2 py-2 text-[var(--foreground)]">
                    {row.maintenancePercentOfReplacement != null
                      ? `${row.maintenancePercentOfReplacement.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-2 py-2 text-xs text-[var(--muted)]">
                    {row.recommendation}
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
