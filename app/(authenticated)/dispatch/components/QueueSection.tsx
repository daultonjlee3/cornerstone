"use client";

import { DispatchWorkOrderCard } from "./DispatchWorkOrderCard";

type QueueWorkOrder = {
  id: string;
  [key: string]: unknown;
};

const SECTION_LIST_MAX_HEIGHT = 280;

type QueueSectionProps = {
  title: string;
  items: QueueWorkOrder[];
  variant: "overdue" | "ready" | "unscheduled";
  collapsed: boolean;
  onToggleCollapse: () => void;
  DraggableWrapper: (props: { workOrder: QueueWorkOrder; children: React.ReactNode }) => React.ReactNode;
  onOpenWorkOrder?: (
    id: string,
    action?: "view" | "reassign" | "complete" | "open" | "unschedule"
  ) => void;
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
  collapsed,
  onToggleCollapse,
  DraggableWrapper,
  onOpenWorkOrder,
}: QueueSectionProps) {
  const styles = stylesForVariant(variant);
  const count = items.length;
  const isScrollable = count > 6;

  return (
    <section className={`mx-1.5 mb-2 overflow-hidden rounded-lg border ${styles.shell}`}>
      <h3
        className={`sticky top-0 z-10 flex items-center justify-between gap-1.5 border-b px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${styles.header}`}
      >
        <span className="min-w-0 truncate">
          {title} ({count})
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium hover:bg-black/5"
          aria-label={collapsed ? "Expand section" : "Collapse section"}
        >
          {collapsed ? "▼" : "▲"}
        </button>
      </h3>
      {!collapsed && (
        <ul
          className={`flex flex-col gap-1.5 p-1.5 ${isScrollable ? "overflow-y-auto overscroll-contain" : ""}`}
          style={isScrollable ? { maxHeight: SECTION_LIST_MAX_HEIGHT } : undefined}
        >
          {count === 0 ? (
            <li className="rounded border border-dashed border-[var(--card-border)] bg-[var(--card)]/50 py-2 text-center text-[11px] text-[var(--muted)]">
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
                      showQuickActions={false}
                      onOpenWorkOrder={onOpenWorkOrder}
                    />
                  ),
                })}
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
