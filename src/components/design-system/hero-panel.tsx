import type { ReactNode } from "react";
import { Surface } from "./surface";

type HeroPanelProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Single focal surface per page — use once as the page hero. */
export function HeroPanel({ children, className = "", id }: HeroPanelProps) {
  return (
    <Surface id={id} as="section" level="hero" className={`cs-hero-panel cs-panel cs-panel--padding-lg ${className}`}>
      {children}
    </Surface>
  );
}
