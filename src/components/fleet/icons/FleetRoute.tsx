"use client";

import { memo } from "react";
import { FLEET_OPS_COLORS } from "./tokens";
import type { FleetIconSize } from "./tokens";
import { resolveIconSize } from "./tokens";

type FleetRouteVariant = "route" | "deadhead" | "dispatch";

type FleetRouteProps = {
  variant?: FleetRouteVariant;
  size?: FleetIconSize;
  color?: string;
  className?: string;
};

export const FleetRoute = memo(function FleetRoute({
  variant = "route",
  size = "sm",
  color,
  className,
}: FleetRouteProps) {
  const px = resolveIconSize(size);
  const accent =
    color ??
    (variant === "deadhead"
      ? FLEET_OPS_COLORS.deadhead
      : variant === "dispatch"
        ? FLEET_OPS_COLORS.dispatch
        : FLEET_OPS_COLORS.route);

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      className={["cs-icon", `cs-icon--${variant}`, className].filter(Boolean).join(" ")}
      style={{ color: accent }}
      aria-hidden
    >
      {variant === "route" && (
        <>
          <circle cx="6" cy="18" r="2.25" className="cs-icon__fill" />
          <circle cx="18" cy="6" r="2.25" className="cs-icon__fill" />
          <path
            d="M8 16.5c3-1 4-4 7-5.5 2-1 3.5-1.5 5-3.5"
            className="cs-icon__stroke"
            strokeLinecap="round"
          />
        </>
      )}
      {variant === "deadhead" && (
        <>
          <circle cx="5" cy="12" r="2" className="cs-icon__stroke" />
          <circle cx="19" cy="12" r="2" className="cs-icon__fill" />
          <path d="M7.5 12h9" className="cs-icon__stroke" strokeDasharray="3 2.5" strokeLinecap="round" />
        </>
      )}
      {variant === "dispatch" && (
        <>
          <rect x="4" y="5" width="16" height="14" rx="3" className="cs-icon__stroke" />
          <path d="M8 10h8M8 13.5h5" className="cs-icon__stroke" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
});
