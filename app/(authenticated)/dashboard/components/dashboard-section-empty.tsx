import Link from "next/link";

type Props = {
  message: string;
  /** Optional short reason or subtext (e.g. "Create a work order to see it here.") */
  subtext?: string;
  /** Optional CTA label and href (e.g. "Create Work Order" -> /work-orders) */
  cta?: { label: string; href: string };
  className?: string;
};

/**
 * Consistent empty state for dashboard list/panel sections.
 * Use when a section has no items so the page feels intentional, not broken.
 */
export function DashboardSectionEmpty({
  message,
  subtext,
  cta,
  className = "",
}: Props) {
  return (
    <div
      className={`rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-5 text-center ${className}`}
      role="status"
    >
      <p className="text-sm text-[var(--muted)]">{message}</p>
      {subtext ? (
        <p className="mt-1 text-xs text-[var(--muted)]/90">{subtext}</p>
      ) : null}
      {cta ? (
        <div className="mt-3">
          <Link
            href={cta.href}
            className="inline-flex items-center rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
          >
            {cta.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
