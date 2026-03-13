import { Card, CardContent } from "./card";

type MetricTrend = {
  label: string;
  tone?: "neutral" | "good" | "bad";
};

type MetricCardProps = {
  title: string;
  value: string | number;
  description?: string;
  trend?: MetricTrend;
  className?: string;
};

export function MetricCard({
  title,
  value,
  description,
  trend,
  className = "",
}: MetricCardProps) {
  const trendClass =
    trend?.tone === "good"
      ? "text-emerald-700"
      : trend?.tone === "bad"
      ? "text-red-700"
      : "text-[var(--muted)]";

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <CardContent>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 h-9 w-9 rounded-full bg-[var(--accent)]/10"
        />
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          {title}
        </p>
        <p className="ui-kpi-value mt-2 text-[var(--foreground)]">
          {value}
        </p>
        {description ? (
          <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
        ) : null}
        {trend ? (
          <p className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${trendClass} ${
            trend?.tone === "good"
              ? "border-emerald-200 bg-emerald-50"
              : trend?.tone === "bad"
              ? "border-red-200 bg-red-50"
              : "border-[var(--card-border)] bg-[var(--background)]/75"
          }`}>
            {trend.label}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
