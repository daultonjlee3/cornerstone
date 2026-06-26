"use client";

import { memo } from "react";
import { FleetMarker } from "./FleetMarker";
import { FLEET_JOB_COLORS } from "./tokens";
import type { FleetJobProps, FleetJobStatus } from "./types";

function resolveJobColor(
  status: FleetJobStatus,
  priority: FleetJobProps["priority"],
  override?: string
): string {
  if (override) return override;
  if (priority === "urgent") return FLEET_JOB_COLORS.emergency;
  if (priority === "high") return FLEET_JOB_COLORS.highPriority;
  return FLEET_JOB_COLORS[status] ?? FLEET_JOB_COLORS.normal;
}

/** Cornerstone site marker — rounded hexagon, not a generic map pin */
const CornerstoneSiteSvg = memo(function CornerstoneSiteSvg() {
  return (
    <svg viewBox="0 0 24 28" fill="none" aria-hidden className="cs-job-marker__svg">
      <path
        d="M12 3.25 18.75 7v9.5L12 22.75 5.25 16.5V7L12 3.25Z"
        className="cs-job-marker__shell"
      />
      <circle cx="12" cy="12.5" r="3.25" className="cs-job-marker__core" />
    </svg>
  );
});

export const FleetJob = memo(function FleetJob({
  status = "normal",
  priority = "default",
  size = "sm",
  selected,
  recommended,
  animated = true,
  color,
  className,
}: FleetJobProps) {
  const accent = resolveJobColor(status, priority, color);
  const isRecommended = recommended || status === "recommended";
  const isSelected = selected || status === "selected";
  const isEmergency = priority === "urgent" || status === "emergency" || status === "risk";
  const isDelayed = status === "late" || status === "delayed";

  return (
    <span
      className={[
        "cs-job-marker",
        `cs-job-marker--${status}`,
        `cs-job-marker--pri-${priority}`,
        isEmergency ? "cs-job-marker--emergency" : "",
        isDelayed ? "cs-job-marker--delayed" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ color: accent }}
      data-status={status}
      aria-hidden
    >
      <FleetMarker
        size={size}
        selected={isSelected}
        recommended={isRecommended}
        animated={animated}
        ringVariant={isEmergency ? "alert" : undefined}
      >
        <span className="cs-job-marker__icon">
          <CornerstoneSiteSvg />
        </span>
      </FleetMarker>
    </span>
  );
});
