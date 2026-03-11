import { DataTable } from "@/src/components/ui/data-table";

type WorkloadPanelProps = {
  title: string;
  description: string;
  tableClassName?: string;
  children: React.ReactNode;
};

export function WorkloadPanel({
  title,
  description,
  tableClassName = "",
  children,
}: WorkloadPanelProps) {
  return (
    <section className="shrink-0 rounded-lg border border-[var(--card-border)]/80 bg-[var(--card)]/50 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {title}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--muted)]">{description}</p>
      <DataTable className={`mt-2 shadow-none ${tableClassName}`}>{children}</DataTable>
    </section>
  );
}
