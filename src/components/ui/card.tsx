import type { ReactNode } from "react";
import { Panel } from "@/src/components/design-system";

type CardProps = {
  children: ReactNode;
  className?: string;
};

/** @deprecated Use Panel from design-system. Kept for backwards compatibility. */
export function Card({ children, className = "" }: CardProps) {
  return (
    <Panel level="raised" padding="none" className={className}>
      {children}
    </Panel>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <header
      className={`border-b border-[var(--surface-border-subtle)] px-5 py-4 ${className}`}
    >
      {children}
    </header>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h3 className={`cs-text-section-title ${className}`}>{children}</h3>;
}

export function CardDescription({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`cs-text-caption cs-text-muted mt-1 ${className}`}>{children}</p>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
