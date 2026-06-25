import type { ReactNode } from "react";
import { Surface } from "./surface";
import type { SurfaceLevel } from "./types";

type PanelProps = {
  children: ReactNode;
  className?: string;
  /** Raised is the default panel elevation. */
  level?: Extract<SurfaceLevel, "default" | "raised" | "hero">;
  padding?: "none" | "sm" | "md" | "lg";
  id?: string;
};

const PADDING_CLASS: Record<NonNullable<PanelProps["padding"]>, string> = {
  none: "cs-panel--padding-none",
  sm: "cs-panel--padding-sm",
  md: "cs-panel--padding-md",
  lg: "cs-panel--padding-lg",
};

export function Panel({
  children,
  className = "",
  level = "raised",
  padding = "md",
  id,
}: PanelProps) {
  return (
    <Surface
      id={id}
      as="section"
      level={level}
      className={`cs-panel ${PADDING_CLASS[padding]} ${className}`}
    >
      {children}
    </Surface>
  );
}
