"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Panel } from "./panel";
import type { KpiEmphasis } from "./types";

type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
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
  icon: Icon,
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
          {Icon ? <Icon className="cs-icon cs-icon--sm cs-text-muted" strokeWidth={1.5} aria-hidden /> : null}
        </div>
        <p className="cs-text-kpi cs-kpi-card__value">{value}</p>
        {hint ? <p className="cs-text-caption cs-text-muted cs-kpi-card__hint">{hint}</p> : null}
      </Panel>
    </motion.div>
  );
}
