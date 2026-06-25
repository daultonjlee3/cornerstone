import type { ReactNode } from "react";
import { HeroPanel, Panel } from "@/src/components/design-system";

type FleetPanelProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "accent";
  id?: string;
};

/** @deprecated Use Panel or HeroPanel from design-system. */
export function FleetPanel({
  children,
  className = "",
  variant = "default",
  id,
}: FleetPanelProps) {
  if (variant === "accent") {
    return (
      <HeroPanel id={id} className={className}>
        {children}
      </HeroPanel>
    );
  }

  return (
    <Panel id={id} level="raised" padding="md" className={className}>
      {children}
    </Panel>
  );
}
