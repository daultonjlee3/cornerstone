import type { ReactNode } from "react";

type FleetPanelProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "accent";
  id?: string;
};

const variantClass: Record<NonNullable<FleetPanelProps["variant"]>, string> = {
  default: "fleet-panel",
  elevated: "fleet-panel-elevated",
  accent: "fleet-panel-accent",
};

export function FleetPanel({
  children,
  className = "",
  variant = "default",
  id,
}: FleetPanelProps) {
  return (
    <section id={id} className={`${variantClass[variant]} ${className}`}>
      {children}
    </section>
  );
}
