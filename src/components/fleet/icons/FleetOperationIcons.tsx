"use client";

import { memo } from "react";
import { FLEET_OPS_COLORS } from "./tokens";
import type { FleetIconSize } from "./tokens";
import { resolveIconSize } from "./tokens";

export type FleetOperationIconName =
  | "trucks"
  | "jobs"
  | "recommendations"
  | "routes"
  | "branches"
  | "capacity"
  | "deadhead"
  | "traffic"
  | "heatmap"
  | "dispatch"
  | "ai"
  | "revenue"
  | "gps";

type FleetOperationIconProps = {
  name: FleetOperationIconName;
  size?: FleetIconSize;
  className?: string;
};

export const FleetOperationIcon = memo(function FleetOperationIcon({
  name,
  size = "sm",
  className,
}: FleetOperationIconProps) {
  const px = resolveIconSize(size);
  const color = iconColor(name);

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      className={["cs-icon", `cs-icon--op-${name}`, className].filter(Boolean).join(" ")}
      style={{ color }}
      aria-hidden
    >
      {renderPaths(name)}
    </svg>
  );
});

function iconColor(name: FleetOperationIconName): string {
  switch (name) {
    case "trucks":
      return FLEET_OPS_COLORS.dispatch;
    case "jobs":
      return FLEET_OPS_COLORS.route;
    case "recommendations":
      return FLEET_OPS_COLORS.recommendation;
    case "routes":
      return FLEET_OPS_COLORS.route;
    case "branches":
      return FLEET_OPS_COLORS.capacity;
    case "capacity":
      return FLEET_OPS_COLORS.capacity;
    case "deadhead":
      return FLEET_OPS_COLORS.deadhead;
    case "traffic":
      return FLEET_OPS_COLORS.traffic;
    case "heatmap":
      return FLEET_OPS_COLORS.warning;
    case "dispatch":
      return FLEET_OPS_COLORS.dispatch;
    case "ai":
      return FLEET_OPS_COLORS.ai;
    case "revenue":
      return FLEET_OPS_COLORS.revenue;
    case "gps":
      return FLEET_OPS_COLORS.gps;
    default:
      return FLEET_OPS_COLORS.dispatch;
  }
}

function renderPaths(name: FleetOperationIconName) {
  switch (name) {
    case "trucks":
      return (
        <>
          <rect x="5" y="9" width="14" height="9" rx="2.5" className="cs-icon__stroke" />
          <path d="M8 9V7a4 4 0 0 1 8 0v2" className="cs-icon__stroke" />
          <circle cx="8.5" cy="17.5" r="1.5" className="cs-icon__fill" />
          <circle cx="15.5" cy="17.5" r="1.5" className="cs-icon__fill" />
        </>
      );
    case "jobs":
      return (
        <>
          <path d="M12 4 17.5 7v8L12 18.5 6.5 15V7L12 4Z" className="cs-icon__stroke" />
          <circle cx="12" cy="11" r="2.25" className="cs-icon__fill" />
        </>
      );
    case "recommendations":
      return (
        <>
          <circle cx="12" cy="12" r="7" className="cs-icon__stroke" />
          <circle cx="12" cy="12" r="2.75" className="cs-icon__fill" />
          <path d="M12 5v2M12 17v2M5 12h2M17 12h2" className="cs-icon__stroke" strokeLinecap="round" />
        </>
      );
    case "routes":
      return (
        <>
          <circle cx="6" cy="17" r="2" className="cs-icon__fill" />
          <circle cx="18" cy="7" r="2" className="cs-icon__fill" />
          <path d="M8 15c3-1.5 4.5-4.5 8-6" className="cs-icon__stroke" strokeLinecap="round" />
        </>
      );
    case "branches":
      return (
        <>
          <rect x="4" y="8" width="16" height="11" rx="2.5" className="cs-icon__stroke" />
          <path d="M8 8V6.5a4 4 0 0 1 8 0V8" className="cs-icon__stroke" />
        </>
      );
    case "capacity":
      return (
        <>
          <circle cx="12" cy="12" r="7.5" className="cs-icon__stroke" />
          <path d="M12 7v5l3.5 2" className="cs-icon__stroke" strokeLinecap="round" />
        </>
      );
    case "deadhead":
      return (
        <>
          <circle cx="6" cy="12" r="2" className="cs-icon__stroke" />
          <circle cx="18" cy="12" r="2" className="cs-icon__fill" />
          <path d="M8.5 12h7" className="cs-icon__stroke" strokeDasharray="2.5 2" />
        </>
      );
    case "traffic":
      return (
        <>
          <rect x="5" y="5" width="14" height="14" rx="3" className="cs-icon__stroke" />
          <path d="M9 9h6M9 12h6M9 15h4" className="cs-icon__stroke" strokeLinecap="round" />
        </>
      );
    case "heatmap":
      return (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1.5" className="cs-icon__fill" opacity="0.45" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" className="cs-icon__fill" opacity="0.7" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" className="cs-icon__fill" opacity="0.85" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" className="cs-icon__fill" />
        </>
      );
    case "dispatch":
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="3" className="cs-icon__stroke" />
          <path d="M8 10h8M8 13.5h5.5" className="cs-icon__stroke" strokeLinecap="round" />
        </>
      );
    case "ai":
      return (
        <>
          <path d="M12 4l2.2 4.5 5 .7-3.6 3.5.85 5L12 15.8 7.55 17.7l.85-5L4.8 9.2l5-.7L12 4Z" className="cs-icon__stroke" />
          <circle cx="12" cy="12" r="1.75" className="cs-icon__fill" />
        </>
      );
    case "revenue":
      return (
        <>
          <path d="M6 17V9.5l6-3.5 6 3.5V17" className="cs-icon__stroke" />
          <path d="M9.5 13.5h5" className="cs-icon__stroke" strokeLinecap="round" />
        </>
      );
    case "gps":
      return (
        <>
          <circle cx="12" cy="12" r="7.5" className="cs-icon__stroke" />
          <circle cx="12" cy="12" r="2.25" className="cs-icon__fill" />
          <path d="M12 4.5v2M12 17.5v2" className="cs-icon__stroke" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}
