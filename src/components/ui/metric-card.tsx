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
      ? "text-emerald-600 dark:text-emerald-400"
      : trend?.tone === "bad"
      ? "text-red-600 dark:text-red-400"
      : "text-[var(--muted)]";

  return (
    <Card className={className}>
      <CardContent>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          {title}
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          {value}
        </p>
        {description ? (
          <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
        ) : null}
        {trend ? <p className={`mt-2 text-xs font-medium ${trendClass}`}>{trend.label}</p> : null}
      </CardContent>
    </Card>
  );
}
