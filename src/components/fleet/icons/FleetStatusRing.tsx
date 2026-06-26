"use client";

import { memo } from "react";

type FleetStatusRingProps = {
  variant?: "selected" | "recommended" | "alert" | "none";
  pulse?: boolean;
  size?: number;
};

export const FleetStatusRing = memo(function FleetStatusRing({
  variant = "none",
  pulse = false,
  size = 32,
}: FleetStatusRingProps) {
  if (variant === "none") return null;

  return (
    <span
      className={[
        "cs-status-ring",
        `cs-status-ring--${variant}`,
        pulse ? "cs-status-ring--pulse" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
});
