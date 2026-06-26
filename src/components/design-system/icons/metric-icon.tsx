"use client";

import type { KpiEmphasis } from "../types";
import { AppIcon } from "./app-icon";
import { IconChip } from "./icon-chip";
import type { AppIconIntent, IconChipVariant, MetricIconProps } from "./types";

const EMPHASIS_TO_CHIP: Record<KpiEmphasis, IconChipVariant> = {
  default: "default",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "fleet",
  operational: "fleet",
};

const EMPHASIS_TO_INTENT: Record<KpiEmphasis, AppIconIntent> = {
  default: "muted",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  operational: "operational",
};

/** KPI / metric icon — IconChip for anchor metrics, bare AppIcon for dense rows. */
export function MetricIcon({
  icon,
  prominent = false,
  emphasis = "default",
  className = "",
}: MetricIconProps) {
  if (prominent) {
    return (
      <IconChip
        icon={icon}
        variant={EMPHASIS_TO_CHIP[emphasis]}
        size="sm"
        className={className}
      />
    );
  }

  return (
    <AppIcon
      icon={icon}
      size="sm"
      intent={EMPHASIS_TO_INTENT[emphasis]}
      className={className}
    />
  );
}
