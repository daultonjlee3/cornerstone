"use client";

import { AppIcon } from "./app-icon";
import type { AppIconIntent, IconChipProps, IconChipSize } from "./types";

const CHIP_TO_ICON_SIZE: Record<IconChipSize, "xs" | "sm" | "md" | "lg"> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

const VARIANT_TO_INTENT: Record<NonNullable<IconChipProps["variant"]>, AppIconIntent> = {
  default: "default",
  active: "operational",
  muted: "muted",
  warning: "warning",
  danger: "danger",
  success: "success",
  ai: "ai",
  fleet: "operational",
};

export function IconChip({
  icon,
  variant = "fleet",
  size = "md",
  glow = false,
  className = "",
  label,
}: IconChipProps) {
  return (
    <span
      className={[
        "cs-icon-chip",
        `cs-icon-chip--${variant}`,
        `cs-icon-chip--${size}`,
        glow ? "cs-icon-chip--glow" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      <AppIcon icon={icon} size={CHIP_TO_ICON_SIZE[size]} intent={VARIANT_TO_INTENT[variant]} />
    </span>
  );
}
