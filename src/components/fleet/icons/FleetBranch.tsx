"use client";

import { memo } from "react";
import { FLEET_FACILITY_COLORS } from "./tokens";
import type { FleetIconSize } from "./tokens";
import { resolveIconSize } from "./tokens";

type FleetBranchVariant = "branch" | "site" | "yard" | "depot";

type FleetBranchProps = {
  variant?: FleetBranchVariant;
  size?: FleetIconSize;
  color?: string;
  className?: string;
};

export const FleetBranch = memo(function FleetBranch({
  variant = "branch",
  size = "sm",
  color,
  className,
}: FleetBranchProps) {
  const px = resolveIconSize(size);
  const accent = color ?? FLEET_FACILITY_COLORS[variant];

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      className={["cs-icon", "cs-icon--facility", className].filter(Boolean).join(" ")}
      style={{ color: accent }}
      aria-hidden
    >
      {variant === "branch" && (
        <>
          <rect x="4" y="8" width="16" height="12" rx="2.5" className="cs-icon__fill" />
          <path d="M8 8V6a4 4 0 0 1 8 0v2" className="cs-icon__stroke" strokeLinecap="round" />
          <path d="M9 13h6M9 16h4" className="cs-icon__stroke" strokeLinecap="round" />
        </>
      )}
      {variant === "site" && (
        <>
          <path d="M12 3 19 7v10l-7 4-7-4V7l7-4Z" className="cs-icon__stroke" />
          <circle cx="12" cy="12" r="2.75" className="cs-icon__fill" />
        </>
      )}
      {variant === "yard" && (
        <>
          <rect x="3" y="6" width="18" height="14" rx="2.5" className="cs-icon__stroke" />
          <path d="M3 11h18M8 6V4M16 6V4" className="cs-icon__stroke" strokeLinecap="round" />
        </>
      )}
      {variant === "depot" && (
        <>
          <path d="M3 18V9l9-5 9 5v9" className="cs-icon__stroke" />
          <rect x="8" y="12" width="8" height="6" rx="1.5" className="cs-icon__fill" />
        </>
      )}
    </svg>
  );
});
