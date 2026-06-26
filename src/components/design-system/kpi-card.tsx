"use client";

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
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      whileHover={{ y: -1.5 }}
    >
      <Panel padding="md" className={`cs-kpi-card ${EMPHASIS_CLASS[emphasis]} ${className}`}>
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
    </motion.div>
  );
}
