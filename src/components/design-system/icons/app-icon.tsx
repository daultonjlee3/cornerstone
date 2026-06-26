"use client";

import type { AppIconProps } from "./types";

export function AppIcon({
  icon: Icon,
  size = "sm",
  strokeWidth = 1.75,
  intent = "default",
  className = "",
  "aria-hidden": ariaHidden = true,
  "aria-label": ariaLabel,
}: AppIconProps) {
  return (
    <Icon
      className={`cs-app-icon cs-app-icon--${size} cs-app-icon--${intent} ${className}`.trim()}
      strokeWidth={strokeWidth}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
    />
  );
}
