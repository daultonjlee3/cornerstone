import type { ReactNode } from "react";

export function CommandPanel({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[var(--radius-card)] border border-[var(--card-border)] bg-white/82 p-4 shadow-[var(--shadow-soft)] ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
          {description ? <p className="text-xs text-[var(--muted)]">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
