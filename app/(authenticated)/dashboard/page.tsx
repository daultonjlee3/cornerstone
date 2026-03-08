const kpiCards = [
  {
    title: "Open Work Orders",
    value: "—",
    description: "Requiring attention or in progress",
  },
  {
    title: "Preventive Maintenance Due",
    value: "—",
    description: "Scheduled within the next 7 days",
  },
  {
    title: "Technicians Active Today",
    value: "—",
    description: "Currently assigned or on duty",
  },
  {
    title: "Assets Under Maintenance",
    value: "—",
    description: "Out of service or in repair",
  },
  {
    title: "Low Inventory Items",
    value: "—",
    description: "Below reorder threshold",
  },
  {
    title: "Pending Purchase Orders",
    value: "—",
    description: "Awaiting approval or delivery",
  },
  {
    title: "Active Contracts",
    value: "—",
    description: "Currently in effect",
  },
  {
    title: "Invoices Outstanding",
    value: "—",
    description: "Past due or unpaid",
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="pt-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Welcome to Cornerstone Tech. Your workspace is ready.
        </p>
      </header>

      <section aria-label="Operations summary" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm transition-colors hover:border-[var(--card-border)] hover:shadow-md"
            >
              <p className="text-sm font-medium text-[var(--muted)]">
                {card.title}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
