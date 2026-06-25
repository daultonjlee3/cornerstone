import type { ReactNode } from "react";

type FleetSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function FleetSectionHeader({
  eyebrow,
  title,
  description,
  action,
  className = "",
}: FleetSectionHeaderProps) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow ? <p className="fleet-eyebrow">{eyebrow}</p> : null}
        <h2 className={`fleet-section-title ${eyebrow ? "mt-1" : ""}`}>{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
