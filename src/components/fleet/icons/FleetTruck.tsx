"use client";

import { memo } from "react";
import { CornerstoneTruckSvg } from "./CornerstoneTruckSvg";
import { FleetBadge } from "./FleetBadges";
import { FleetMarker } from "./FleetMarker";
import { FLEET_TRUCK_COLORS } from "./tokens";
import type { FleetTruckProps } from "./types";

function unitLabel(unitNumber: string): string {
  return unitNumber.replace(/^#?/, "").slice(0, 4);
}

export const FleetTruck = memo(function FleetTruck({
  status = "available",
  size = "sm",
  selected,
  recommended,
  heading,
  animated = true,
  badge,
  unitLabel: labelProp,
  dimmed,
  color,
  className,
}: FleetTruckProps) {
  const accent = color ?? FLEET_TRUCK_COLORS[status] ?? FLEET_TRUCK_COLORS.available;
  const isRecommended = recommended || status === "recommended";
  const isSelected = selected || status === "selected";
  const showOfflineBadge = status === "offline" && !badge;

  return (
    <span
      className={[
        "cs-truck-marker",
        `cs-truck-marker--${status}`,
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
        heading={heading}
        selected={isSelected}
        recommended={isRecommended}
        animated={animated}
        dimmed={dimmed}
      >
        <span className="cs-truck-marker__icon">
          <CornerstoneTruckSvg />
        </span>
      </FleetMarker>
      {badge ? (
        <span className="cs-truck-marker__badge-slot">
          <FleetBadge type={badge} />
        </span>
      ) : showOfflineBadge ? (
        <span className="cs-truck-marker__badge-slot">
          <FleetBadge type="gpsLost" />
        </span>
      ) : null}
      {labelProp ? (
        <span className="cs-truck-marker__label">{unitLabel(labelProp)}</span>
      ) : null}
    </span>
  );
});
