import type { LucideIcon } from "lucide-react";
import { KpiCard } from "@/src/components/design-system";
import type { KpiEmphasis } from "@/src/components/design-system/types";

type MetricTrend = {
  label: string;
  tone?: "neutral" | "good" | "bad";
};

type MetricCardVariant = "default" | "danger" | "success";

type MetricCardProps = {
  title: string;
  value: string | number;
  description?: string;
  trend?: MetricTrend;
  className?: string;
  icon?: LucideIcon;
  variant?: MetricCardVariant;
};

const variantToEmphasis: Record<MetricCardVariant, KpiEmphasis> = {
  default: "default",
  danger: "danger",
  success: "success",
};

/** @deprecated Use KpiCard from design-system. */
export function MetricCard({
  title,
  value,
  description,
  className = "",
  icon,
  variant = "default",
}: MetricCardProps) {
  return (
    <KpiCard
      label={title}
      value={value}
      hint={description}
      icon={icon}
      emphasis={variantToEmphasis[variant]}
      className={className}
    />
  );
}
