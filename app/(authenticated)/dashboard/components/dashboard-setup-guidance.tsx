import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

type Props = {
  /** No companies under this tenant (e.g. setup not started). */
  noCompanies: boolean;
  /** Tenant has companies but no work orders, technicians, or PM plans yet. */
  emptyButConfigured: boolean;
};

/**
 * Shown when the Operations Command Center would otherwise show only zeros and empty lists.
 * Guides the user to add companies, work orders, technicians, or PM so the dashboard becomes useful.
 */
export function DashboardSetupGuidance({ noCompanies, emptyButConfigured }: Props) {
  if (!noCompanies && !emptyButConfigured) return null;

  if (noCompanies) {
    return (
      <section
        className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)]"
        role="region"
        aria-label="Get started"
      >
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
            <LayoutDashboard className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Set up your operations
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Add a company or location to start tracking work orders, assets, and preventive maintenance. Metrics and alerts will appear here once you have data.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/settings/company"
                className="inline-flex items-center rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
              >
                Company settings
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)]"
      role="region"
      aria-label="Get started"
    >
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
          <LayoutDashboard className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Your command center will fill as you add data
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Create work orders, add technicians, or set up preventive maintenance plans to see live metrics and alerts here.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/work-orders"
              className="inline-flex items-center rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
            >
              Work orders
            </Link>
            <Link
              href="/assets"
              className="inline-flex items-center rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
            >
              Assets
            </Link>
            <Link
              href="/preventive-maintenance"
              className="inline-flex items-center rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
            >
              Preventive maintenance
            </Link>
            <Link
              href="/technicians"
              className="inline-flex items-center rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
            >
              Technicians
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
