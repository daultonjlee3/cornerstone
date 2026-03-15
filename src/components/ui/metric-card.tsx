import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "./card";

type MetricTrend = {
  label: string;
  tone?: "neutral" | "good" | "bad";
};

/** Affects card border/background and optional icon tint. Use sparingly for state (e.g. overdue = danger, completed today > 0 = success). */
type MetricCardVariant = "default" | "danger" | "success";

type MetricCardProps = {
  title: string;
  value: string | number;
  description?: string;
  trend?: MetricTrend;
  className?: string;
  /** Optional Lucide icon to show in the top-right circle */
  icon?: LucideIcon;
  /** Subtle card state styling; icon uses matching muted tint when set */
  variant?: MetricCardVariant;
};

const variantCardClass: Record<MetricCardVariant, string> = {
  default: "",
  danger: "border-red-200/60 bg-red-50/20 dark:border-red-900/40 dark:bg-red-950/20",
  success: "border-emerald-200/50 bg-emerald-50/20 dark:border-emerald-900/30 dark:bg-emerald-950/20",
};

const variantIconClass: Record<MetricCardVariant, string> = {
  default: "text-gray-400 dark:text-gray-500",
  danger: "text-red-400/90 dark:text-red-500/80",
  success: "text-emerald-500/80 dark:text-emerald-400/70",
};

export function MetricCard({
  title,
  value,
  description,
  trend,
  className = "",
  icon: Icon,
  variant = "default",
}: MetricCardProps) {
  const trendClass =
    trend?.tone === "good"
      ? "text-emerald-700 dark:text-emerald-400"
      : trend?.tone === "bad"
      ? "text-red-700 dark:text-red-400"
      : "text-[var(--muted)]";

  return (
    <Card className={`relative overflow-hidden ${variantCardClass[variant]} ${className}`}>
      <CardContent>
        <div
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/10"
        >
          {Icon ? (
            <Icon className={`size-[18px] shrink-0 ${variantIconClass[variant]}`} strokeWidth={1.5} />
          ) : null}
        </div>
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
