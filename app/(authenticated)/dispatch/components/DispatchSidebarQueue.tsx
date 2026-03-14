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
  /** When set, the matching queue item is highlighted and can be scrolled into view (e.g. from map selection). */
  selectedWorkOrderId?: string | null;
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
  const [mounted, setMounted] = useState(false);
  const [overdueSectionCollapsed, setOverdueSectionCollapsed] = useState(false);
  const [readySectionCollapsed, setReadySectionCollapsed] = useState(false);
  const [unscheduledSectionCollapsed, setUnscheduledSectionCollapsed] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const o = window.sessionStorage.getItem(STORAGE_KEY_OVERDUE);
    const r = window.sessionStorage.getItem(STORAGE_KEY_READY);
    const u = window.sessionStorage.getItem(STORAGE_KEY_UNSCHEDULED);
    if (o != null) setOverdueSectionCollapsed(o === "1");
    if (r != null) setReadySectionCollapsed(r === "1");
    if (u != null) setUnscheduledSectionCollapsed(u === "1");
  }, [mounted]);

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

  const expandedBackdrop = !collapsed ? (
    <div
      className="fixed inset-0 z-30 bg-black/25 lg:hidden"
      aria-hidden
      onClick={onToggleCollapse}
    />
  ) : null;

  if (collapsed) {
    return (
      <aside
        ref={setNodeRef}
        className={`flex w-12 shrink-0 flex-col items-center justify-between border-r border-[var(--card-border)] bg-[var(--card)]/90 py-2 ${
          highlighted ? "bg-amber-50/90 ring-2 ring-inset ring-amber-400/50" : ""
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded border border-[var(--card-border)] bg-[var(--background)] px-1 py-0.5 text-[10px] font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]/40"
          aria-label="Expand dispatch queue"
          title="Expand queue"
        >
          &gt;&gt;
        </button>
        <div className="flex flex-col items-center gap-1">
          <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
            {totalJobs}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--muted)] [writing-mode:vertical-rl]">
            Queue
          </span>
        </div>
        {isDraggingWorkOrder ? (
          <p className="px-0.5 text-center text-[9px] text-[var(--muted)]">Drop to unschedule</p>
        ) : <span />}
      </aside>
    );
  }

  return (
    <>
      {expandedBackdrop}
    <aside
      ref={setNodeRef}
      className={`flex shrink-0 flex-col overflow-y-auto border-r border-[var(--card-border)] bg-[var(--card)]/95 shadow-[var(--shadow-soft)]
        fixed inset-y-0 left-0 z-40 w-[280px] lg:relative lg:inset-auto lg:z-auto lg:w-[320px] lg:shadow-none ${
        highlighted ? "bg-amber-50/90 ring-2 ring-inset ring-amber-400/40" : ""
      }`}
    >
      <div className="sticky top-0 z-20 shrink-0 border-b border-[var(--card-border)] bg-[var(--card)] px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <p className="text-xs font-semibold text-[var(--foreground)]">Queue</p>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded border border-[var(--card-border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            aria-label="Collapse queue"
          >
            &lt;&lt;
          </button>
        </div>
        <p className="mt-0.5 text-[10px] text-[var(--muted)]">
          Drag into a lane to schedule. Drop here to unschedule.
        </p>
        {isDraggingWorkOrder ? (
          <p className="mt-0.5 text-[10px] font-medium text-amber-600">Drop here to unschedule</p>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {!mounted ? (
          <p className="px-2 text-[10px] text-[var(--muted)]">Loading queue…</p>
        ) : (
          <>
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
              selectedWorkOrderId={selectedWorkOrderId}
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
              selectedWorkOrderId={selectedWorkOrderId}
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
              selectedWorkOrderId={selectedWorkOrderId}
            />
          </>
        )}
      </div>
    </aside>
    </>
  );
}
