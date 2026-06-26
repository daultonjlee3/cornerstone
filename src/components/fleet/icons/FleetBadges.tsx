"use client";

import { memo } from "react";
import type { FleetBadgeType } from "./types";
import { FLEET_BADGE_COLORS } from "./tokens";

const BADGE_LABELS: Record<FleetBadgeType, string> = {
  pm: "PM",
  fuel: "FU",
  inspection: "IN",
  alert: "!",
  highRevenue: "$",
  critical: "!!",
  gpsLost: "GPS",
};

type FleetBadgeProps = {
  type: FleetBadgeType;
  size?: "sm" | "md";
};

export const FleetBadge = memo(function FleetBadge({ type, size = "sm" }: FleetBadgeProps) {
  const label = BADGE_LABELS[type];
  const color = FLEET_BADGE_COLORS[type];

  return (
    <span
      className={`cs-badge cs-badge--${size}`}
      style={{ "--cs-badge-color": color } as React.CSSProperties}
      title={type}
      aria-label={type}
    >
      {label}
    </span>
  );
});

type FleetBadgesProps = {
  badges?: FleetBadgeType[];
  size?: "sm" | "md";
};

export const FleetBadges = memo(function FleetBadges({ badges, size = "sm" }: FleetBadgesProps) {
  if (!badges?.length) return null;

  return (
    <span className="cs-badges" aria-hidden>
      {badges.map((badge) => (
        <FleetBadge key={badge} type={badge} size={size} />
      ))}
    </span>
  );
});
