"use client";

import { memo } from "react";
import { FLEET_OPS_COLORS } from "./tokens";
import type { FleetIconSize } from "./tokens";
import { resolveIconSize } from "./tokens";

type FleetAlertVariant = "alert" | "warning";

type FleetAlertProps = {
  variant?: FleetAlertVariant;
  size?: FleetIconSize;
  className?: string;
};

export const FleetAlert = memo(function FleetAlert({
  variant = "alert",
  size = "sm",
  className,
}: FleetAlertProps) {
  const px = resolveIconSize(size);
  const color = variant === "warning" ? FLEET_OPS_COLORS.warning : FLEET_OPS_COLORS.alert;

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      className={["cs-icon", `cs-icon--${variant}`, className].filter(Boolean).join(" ")}
      style={{ color }}
      aria-hidden
    >
      <path
        d="M12 4.5 19.5 18H4.5L12 4.5Z"
        className="cs-icon__stroke"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" className="cs-icon__stroke" strokeLinecap="round" />
      <circle cx="12" cy="16.75" r="0.9" className="cs-icon__fill" />
    </svg>
  );
});
