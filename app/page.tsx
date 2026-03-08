/**
 * Cornerstone Tech — Landing dashboard.
 * Placeholder cards for core ERP modules; no business logic.
 */

import Link from "next/link";

const cards = [
  { title: "Companies", href: "#", description: "Manage tenants" },
  { title: "Buildings", href: "#", description: "Properties & locations" },
  { title: "Units", href: "#", description: "Spaces within buildings" },
  { title: "Work Orders", href: "#", description: "Maintenance & service jobs" },
  { title: "Assets", href: "#", description: "Equipment & systems" },
  { title: "Vendors", href: "#", description: "Contractors & suppliers" },
  { title: "Contracts", href: "#", description: "Agreements & terms" },
  { title: "Invoices", href: "#", description: "Billing & payments" },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight">
            Cornerstone Tech
          </span>
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Cornerstone Tech
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Facility maintenance & commercial service ERP
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ title, href, description }) => (
            <Link
              key={title}
              href={href}
              className="group flex flex-col rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm transition-colors hover:border-[var(--accent)] hover:shadow-md"
            >
              <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--accent)]">
                {title}
              </span>
              <span className="mt-1 text-sm text-[var(--muted)]">
                {description}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
