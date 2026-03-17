import type { ReactNode } from "react";

export function FormSection({
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
    <section className={`rounded-[var(--radius-card)] border border-[var(--card-border)] bg-white/75 p-4 ${className}`}>
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {description ? <p className="mt-1 text-xs text-[var(--muted)]">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
