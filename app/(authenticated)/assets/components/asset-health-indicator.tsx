import type { HealthCategory } from "@/src/lib/assets/intelligence-types";

function categoryForScore(score: number | null): HealthCategory {
  const safe = Number(score ?? 0);
  if (safe >= 90) return "excellent";
  if (safe >= 70) return "good";
  if (safe >= 50) return "warning";
  if (safe >= 30) return "poor";
  return "critical";
}

function categoryLabel(category: HealthCategory): string {
  if (category === "excellent") return "Excellent";
  if (category === "good") return "Good";
  if (category === "warning") return "Warning";
  if (category === "poor") return "Poor";
  return "Critical";
}

function toneClass(category: HealthCategory): string {
  if (category === "excellent") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (category === "good") return "text-blue-700 bg-blue-50 border-blue-200";
  if (category === "warning") return "text-amber-700 bg-amber-50 border-amber-200";
  if (category === "poor") return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-red-700 bg-red-50 border-red-200";
}

type AssetHealthIndicatorProps = {
  score: number | null;
  failureRisk: number | null;
  lastCalculatedAt: string | null;
};

export function AssetHealthIndicator({
  score,
  failureRisk,
  lastCalculatedAt,
}: AssetHealthIndicatorProps) {
  const category = categoryForScore(score);
  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        Asset Health
      </p>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-full border px-3 py-2 text-lg font-bold ${toneClass(category)}`}>
            {Number.isFinite(Number(score)) ? Number(score).toFixed(0) : "—"}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {categoryLabel(category)}
            </p>
            <p className="text-xs text-[var(--muted)]">
              Failure risk:{" "}
              {Number.isFinite(Number(failureRisk)) ? `${Number(failureRisk).toFixed(0)} / 100` : "—"}
            </p>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Last calc:{" "}
          {lastCalculatedAt
            ? new Date(lastCalculatedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "not calculated"}
        </p>
      </div>
    </section>
  );
}
