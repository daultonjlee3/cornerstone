"use client";

import { memo, type ReactNode } from "react";
import { FleetStatusRing } from "./FleetStatusRing";
import { resolveIconSize, type FleetIconSize } from "./tokens";

type FleetMarkerProps = {
  size?: FleetIconSize;
  heading?: number | null;
  selected?: boolean;
  recommended?: boolean;
  animated?: boolean;
  dimmed?: boolean;
  ringVariant?: "selected" | "recommended" | "alert" | "none";
  className?: string;
  children: ReactNode;
};

export const FleetMarker = memo(function FleetMarker({
  size = "sm",
  heading,
  selected,
  recommended,
  animated = true,
  dimmed,
  ringVariant,
  className,
  children,
}: FleetMarkerProps) {
  const px = resolveIconSize(size);
  const hasHeading = heading != null && Number.isFinite(heading);
  const ring =
    ringVariant ??
    (selected ? "selected" : recommended ? "recommended" : "none");

  return (
    <span
      className={[
        "cs-marker",
        animated ? "cs-marker--animated" : "",
        dimmed ? "cs-marker--dimmed" : "",
        selected ? "cs-marker--selected" : "",
        recommended ? "cs-marker--recommended" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--cs-marker-size": `${px}px` } as React.CSSProperties}
      aria-hidden
    >
      <span className="cs-marker__shadow" />
      <FleetStatusRing variant={ring} pulse={recommended} size={px * 1.35} />
      <span
        className={`cs-marker__body ${hasHeading ? "cs-marker__body--headed" : ""}`}
        style={hasHeading ? { transform: `rotate(${heading}deg)` } : undefined}
      >
        {children}
      </span>
    </span>
  );
});
