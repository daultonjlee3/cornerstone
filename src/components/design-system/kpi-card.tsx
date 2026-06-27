"use client";

import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Panel } from "./panel";
import { MetricIcon } from "./icons";
import type { KpiEmphasis } from "./types";

type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /** When true, renders icon in IconChip (anchor metrics). Default false for dense grids. */
  iconProminent?: boolean;
  emphasis?: KpiEmphasis;
  className?: string;
  /** Command Center — opens insight panel */
  selected?: boolean;
  interactive?: boolean;
  onSelect?: () => void;
  onPrefetch?: () => void;
};

const EMPHASIS_CLASS: Record<KpiEmphasis, string> = {
  default: "",
  success: "cs-kpi-card--success",
  warning: "cs-kpi-card--warning",
  danger: "cs-kpi-card--danger",
  info: "cs-kpi-card--info",
  operational: "cs-kpi-card--operational",
};

export function KpiCard({
  label,
  value,
  hint,
  icon,
  iconProminent = false,
  emphasis = "default",
  className = "",
  selected = false,
  interactive = false,
  onSelect,
  onPrefetch,
}: KpiCardProps) {
  const panelClass = [
    "cs-kpi-card",
    EMPHASIS_CLASS[emphasis],
    interactive ? "cs-kpi-card--interactive" : "",
    selected ? "cs-kpi-card--selected" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <Panel padding="md" className={panelClass}>
      <div className="cs-kpi-card__header">
        <p className="cs-text-micro cs-text-muted">{label}</p>
        {icon ? (
          <MetricIcon
            icon={icon}
            prominent={iconProminent}
            emphasis={emphasis}
            className="cs-kpi-card__metric-icon"
          />
        ) : null}
      </div>
      <p className="cs-text-kpi cs-kpi-card__value">{value}</p>
      {hint ? <p className="cs-text-caption cs-text-muted cs-kpi-card__hint">{hint}</p> : null}
    </Panel>
  );

  const inner = interactive ? (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className="block w-full text-left"
      onClick={onSelect}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
    >
      {content}
    </div>
  ) : (
    content
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      whileHover={interactive ? { y: -1.5 } : undefined}
    >
      {inner}
    </motion.div>
  );
}
