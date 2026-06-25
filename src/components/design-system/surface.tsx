import type { ElementType, HTMLAttributes, ReactNode } from "react";
import type { SurfaceLevel } from "./types";

const SURFACE_CLASS: Record<SurfaceLevel, string> = {
  canvas: "cs-surface cs-surface--canvas",
  default: "cs-surface cs-surface--default",
  raised: "cs-surface cs-surface--raised",
  hero: "cs-surface cs-surface--hero",
};

type SurfaceProps = {
  children: ReactNode;
  level?: SurfaceLevel;
  as?: ElementType;
  className?: string;
  id?: string;
} & HTMLAttributes<HTMLElement>;

export function Surface({
  children,
  level = "default",
  as: Component = "div",
  className = "",
  id,
  ...rest
}: SurfaceProps) {
  return (
    <Component id={id} className={`${SURFACE_CLASS[level]} ${className}`} {...rest}>
      {children}
    </Component>
  );
}
