"use client";

import { DispatchWorkOrderCard } from "./DispatchWorkOrderCard";

type QueueWorkOrder = {
  id: string;
  [key: string]: unknown;
};

type QueueSectionProps = {
  title: string;
  items: QueueWorkOrder[];
  variant: "overdue" | "ready" | "unscheduled";
  DraggableWrapper: (props: { workOrder: QueueWorkOrder; children: React.ReactNode }) => React.ReactNode;
  onOpenWorkOrder?: (id: string, action?: "view" | "reassign" | "complete" | "open") => void;
};

function stylesForVariant(variant: QueueSectionProps["variant"]) {
  if (variant === "overdue") {
    return {
      shell: "border-red-200/80 bg-red-50/45",
      header:
        "border-red-200/80 bg-gradient-to-r from-red-50 to-red-100/70 text-red-700",
      count: "bg-red-100 text-red-700",
    };
  }
  if (variant === "ready") {
    return {
      shell: "border-emerald-200/80 bg-emerald-50/35",
      header:
        "border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-emerald-100/70 text-emerald-700",
      count: "bg-emerald-100 text-emerald-700",
    };
  }
  return {
    shell: "border-[var(--card-border)] bg-[var(--card)]/40",
    header:
      "border-[var(--card-border)] bg-gradient-to-r from-slate-50 to-slate-100/70 text-[var(--muted-strong)]",
    count: "bg-slate-200/80 text-slate-700",
  };
}

export function QueueSection({
  title,
  items,
  variant,
  DraggableWrapper,
  onOpenWorkOrder,
}: QueueSectionProps) {
  const styles = stylesForVariant(variant);
  return (
    <section className={`mx-2 mb-3 overflow-hidden rounded-xl border ${styles.shell}`}>
      <h3
        className={`sticky top-0 z-10 flex items-center justify-between border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${styles.header}`}
      >
        <span>{title}</span>
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${styles.count}`}>
          {items.length}
        </span>
      </h3>
      <ul className="flex flex-col gap-2 p-2.5">
        {items.length === 0 ? (
          <li className="rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card)]/70 py-3 text-center text-xs text-[var(--muted)]">
            None
          </li>
        ) : (
          items.map((wo) => (
            <li key={wo.id}>
              {DraggableWrapper({
                workOrder: wo,
                children: (
                  <DispatchWorkOrderCard
                    workOrder={wo}
                    variant="block"
                    showScheduledTime
                    showCrew={false}
                    showQuickActions={!!onOpenWorkOrder}
                    onOpenWorkOrder={onOpenWorkOrder}
                  />
                ),
              })}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
