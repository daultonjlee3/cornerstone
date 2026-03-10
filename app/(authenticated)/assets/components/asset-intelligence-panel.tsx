import type {
  AssetHealthBreakdown,
  AssetInsightRecord,
} from "@/src/lib/assets/intelligence-types";

function severityClass(severity: AssetInsightRecord["severity"]): string {
  if (severity === "critical") return "bg-red-100 text-red-700 border-red-200";
  if (severity === "high") return "bg-orange-100 text-orange-700 border-orange-200";
  if (severity === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

type AssetIntelligencePanelProps = {
  health: AssetHealthBreakdown;
  insights: AssetInsightRecord[];
  upcomingPmCount: number;
};

export function AssetIntelligencePanel({
  health,
  insights,
  upcomingPmCount,
}: AssetIntelligencePanelProps) {
  const replacementHorizonLabel =
    health.remainingLifeYears == null
      ? "No lifecycle estimate set"
      : health.remainingLifeYears <= 0
      ? "Past expected lifecycle"
      : `${health.remainingLifeYears.toFixed(1)} years remaining`;
  const costVsReplaceLabel =
    health.repairVsReplaceRatio == null
      ? "Replacement cost not defined"
      : `${(health.repairVsReplaceRatio * 100).toFixed(1)}% of replacement value spent in last 12 months`;

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        Asset Intelligence
      </h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/70 p-3">
          <p className="text-xs text-[var(--muted)]">Health Score</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">
            {health.healthScore.toFixed(0)} ({health.healthCategory})
          </p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/70 p-3">
          <p className="text-xs text-[var(--muted)]">Failure Risk</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">
            {health.failureRisk.toFixed(0)} / 100
          </p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/70 p-3">
          <p className="text-xs text-[var(--muted)]">Upcoming PM Tasks</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">{upcomingPmCount}</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/70 p-3">
          <p className="text-xs text-[var(--muted)]">Replacement Horizon</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">{replacementHorizonLabel}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Insights
        </p>
        {insights.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No recurring issue patterns detected.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {insights.slice(0, 6).map((insight) => (
              <li
                key={insight.id}
                className={`rounded-lg border px-3 py-2 text-sm ${severityClass(insight.severity)}`}
              >
                <p className="font-semibold">
                  {insight.pattern_type.replace(/_/g, " ")} · {insight.frequency}x
                </p>
                <p className="mt-1">{insight.recommendation}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Recommendation
        </p>
        <p className="mt-1 text-sm text-[var(--foreground)]">{health.recommendation}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">{costVsReplaceLabel}</p>
      </div>
    </section>
  );
}
