"use client";

import { useEffect, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { QueueSection } from "./QueueSection";

const STORAGE_KEY_OVERDUE = "dispatch.queue.section.overdue";
const STORAGE_KEY_READY = "dispatch.queue.section.ready";
const STORAGE_KEY_UNSCHEDULED = "dispatch.queue.section.unscheduled";

/** Work order shape for queue items (compatible with LoadDispatchResult lists). */
type QueueWorkOrder = {
  id: string;
  [key: string]: unknown;
};

export type DispatchSidebarQueueProps = {
  unscheduled: QueueWorkOrder[];
  overdue: QueueWorkOrder[];
  ready: QueueWorkOrder[];
  collapsed: boolean;
  overDropId: string | null;
  isDraggingWorkOrder: boolean;
  onToggleCollapse: () => void;
  onOpenWorkOrder?: (
    id: string,
    action?: "view" | "reassign" | "complete" | "open" | "unschedule"
  ) => void;
};

function DraggableQueueCard({ workOrder, children }: { workOrder: QueueWorkOrder; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `queue-wo-${workOrder.id}`,
    data: { type: "dispatch-work-order", workOrder },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? "opacity-50" : undefined}>
      {children}
    </div>
  );
}

export function DispatchSidebarQueue({
  unscheduled,
  overdue,
  ready,
  collapsed,
  overDropId,
  isDraggingWorkOrder,
  onToggleCollapse,
  onOpenWorkOrder,
}: DispatchSidebarQueueProps) {
  const [overdueSectionCollapsed, setOverdueSectionCollapsed] = useState(false);
  const [readySectionCollapsed, setReadySectionCollapsed] = useState(false);
  const [unscheduledSectionCollapsed, setUnscheduledSectionCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const o = window.sessionStorage.getItem(STORAGE_KEY_OVERDUE);
    const r = window.sessionStorage.getItem(STORAGE_KEY_READY);
    const u = window.sessionStorage.getItem(STORAGE_KEY_UNSCHEDULED);
    if (o != null) setOverdueSectionCollapsed(o === "1");
    if (r != null) setReadySectionCollapsed(r === "1");
    if (u != null) setUnscheduledSectionCollapsed(u === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY_OVERDUE, overdueSectionCollapsed ? "1" : "0");
  }, [overdueSectionCollapsed]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY_READY, readySectionCollapsed ? "1" : "0");
  }, [readySectionCollapsed]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY_UNSCHEDULED, unscheduledSectionCollapsed ? "1" : "0");
  }, [unscheduledSectionCollapsed]);

  const totalJobs = overdue.length + ready.length + unscheduled.length;
  const { setNodeRef, isOver } = useDroppable({
    id: "queue-drop-unschedule",
    data: { target: "queue-unschedule" },
  });
  const highlighted = isOver || overDropId === "queue-drop-unschedule";

  if (collapsed) {
    return (
      <aside
        ref={setNodeRef}
        className={`flex w-14 shrink-0 flex-col items-center justify-between border-r border-[var(--card-border)] bg-[var(--card)]/95 py-3 ${
          highlighted ? "bg-amber-100/70 ring-2 ring-inset ring-amber-400/60" : ""
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-md border border-[var(--card-border)] bg-[var(--background)] px-1.5 py-1 text-[11px] font-semibold text-[var(--foreground)] hover:bg-[var(--card-border)]/40"
          aria-label="Expand dispatch queue"
          title="Expand dispatch queue"
        >
          &gt;&gt;
        </button>
        <div className="flex flex-col items-center gap-2">
          <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {totalJobs}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] [writing-mode:vertical-rl]">
            Queue
          </span>
        </div>
        {isDraggingWorkOrder ? (
          <p className="px-1 text-center text-[10px] text-[var(--muted)]">Drop to unschedule</p>
        ) : <span />}
      </aside>
    );
  }

  return (
    <aside
      ref={setNodeRef}
      className={`flex w-80 shrink-0 flex-col overflow-y-auto border-r border-[var(--card-border)] bg-gradient-to-b from-[var(--card)] to-slate-50/60 ${
        highlighted ? "bg-amber-50/95 ring-2 ring-inset ring-amber-400/55" : ""
      }`}
    >
      <div className="sticky top-0 z-20 border-b border-[var(--card-border)] bg-[var(--card)]/95 px-3 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">Dispatch Queue</p>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-border)]/40"
            aria-label="Collapse dispatch queue"
          >
            &lt;&lt; Collapse Queue
          </button>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Prioritize overdue jobs, then drag into a lane to schedule.
        </p>
        {isDraggingWorkOrder ? (
          <p className="mt-1 text-[11px] font-medium text-amber-700">
            Drop a scheduled card here to unschedule immediately.
          </p>
        ) : null}
      </div>
      <div className="py-3">
        <QueueSection
          title="Overdue"
          items={overdue}
          variant="overdue"
          collapsed={overdueSectionCollapsed}
          onToggleCollapse={() => setOverdueSectionCollapsed((c) => !c)}
          DraggableWrapper={({ workOrder, children }) => (
            <DraggableQueueCard workOrder={workOrder}>{children}</DraggableQueueCard>
          )}
          onOpenWorkOrder={onOpenWorkOrder}
        />
        <QueueSection
          title="Ready"
          items={ready}
          variant="ready"
          collapsed={readySectionCollapsed}
          onToggleCollapse={() => setReadySectionCollapsed((c) => !c)}
          DraggableWrapper={({ workOrder, children }) => (
            <DraggableQueueCard workOrder={workOrder}>{children}</DraggableQueueCard>
          )}
          onOpenWorkOrder={onOpenWorkOrder}
        />
        <QueueSection
          title="Unscheduled"
          items={unscheduled}
          variant="unscheduled"
          collapsed={unscheduledSectionCollapsed}
          onToggleCollapse={() => setUnscheduledSectionCollapsed((c) => !c)}
          DraggableWrapper={({ workOrder, children }) => (
            <DraggableQueueCard workOrder={workOrder}>{children}</DraggableQueueCard>
          )}
          onOpenWorkOrder={onOpenWorkOrder}
        />
      </div>
    </aside>
  );
}
