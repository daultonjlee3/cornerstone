"use client";

import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  getTimeSlotLabels,
  getWorkOrderPosition,
  heightPercentToHours,
  addHours,
  toSlotISO,
  DAY_START_HOUR,
} from "./dispatch-board-utils";
import { DispatchWorkOrderCard } from "./DispatchWorkOrderCard";
import type { DispatchViewMode } from "../filter-state";
import { ScheduleLane } from "./ScheduleLane";

const UNASSIGNED_LANE_ID = "__unassigned__";

/** Lane shown as a column (technician or crew). */
export type BoardLane = {
  id: string;
  name?: string | null;
  total_scheduled_hours?: number;
  job_count?: number;
  /** When set, shown in header as "Xh remaining" and passed to ScheduleLane. */
  remainingHours?: number;
};

/** Work order shape used by the board and getWorkOrderPosition. */
type BoardWorkOrder = {
  id: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  estimated_hours?: number | null;
  scheduled_date?: string | null;
  assigned_crew_id?: string | null;
  assigned_technician_id?: string | null;
  [key: string]: unknown;
};

export type DispatchBoardProps = {
  /** Lanes to show (unassigned first, then technicians or crews). */
  lanes: BoardLane[];
  /** Work orders per lane id for the selected date (day view). */
  workOrdersByLane: Map<string, BoardWorkOrder[]>;
  selectedDate: string;
  overDropId: string | null;
  isDraggingWorkOrder: boolean;
  view: DispatchViewMode;
  workOrders: BoardWorkOrder[];
  onSelectDate: (date: string) => void;
  onResizeEnd?: (
    workOrder: {
      id: string;
      assigned_crew_id?: string | null;
      assigned_technician_id?: string | null;
      scheduled_date?: string | null;
      scheduled_start?: string | null;
    },
    newEndISO: string
  ) => void;
  onOpenWorkOrder?: (
    id: string,
    action?: "view" | "reassign" | "complete" | "open" | "unschedule"
  ) => void;
  routeTravelByWorkOrderId?: Map<string, string>;
};

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay(); // Sunday=0
  const offset = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${date}`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function getDurationHours(workOrder: BoardWorkOrder): number {
  if (workOrder.scheduled_start && workOrder.scheduled_end) {
    const start = new Date(workOrder.scheduled_start).getTime();
    const end = new Date(workOrder.scheduled_end).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return (end - start) / (60 * 60 * 1000);
    }
  }
  return workOrder.estimated_hours ?? 1;
}

function getCurrentTimePercent(now: Date): number | null {
  const dayStart = DAY_START_HOUR * 60;
  const dayEnd = 18 * 60;
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < dayStart || minutes > dayEnd) return null;
  return ((minutes - dayStart) / (dayEnd - dayStart)) * 100;
}

function getCurrentTimeSlot(now: Date): { hour: number; minute: number } | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const dayStart = DAY_START_HOUR * 60;
  const dayEnd = 18 * 60;
  if (minutes < dayStart || minutes > dayEnd) return null;
  return { hour: now.getHours(), minute: now.getMinutes() };
}

function ResizeHandle({
  workOrder,
  selectedDate,
  currentHeightPercent,
  onResizeEnd,
  disabled,
}: {
  workOrder: BoardWorkOrder;
  selectedDate: string;
  currentHeightPercent: number;
  onResizeEnd: (workOrder: { id: string; assigned_crew_id?: string | null; scheduled_date?: string | null; scheduled_start?: string | null }, newEndISO: string) => void;
  disabled?: boolean;
}) {
  const [resizing, setResizing] = useState(false);
  const startY = useRef(0);
  const startHeightPercent = useRef(0);
  const lastHeightPercent = useRef(currentHeightPercent);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);
      startY.current = e.clientY;
      startHeightPercent.current = currentHeightPercent;
      lastHeightPercent.current = currentHeightPercent;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [currentHeightPercent, disabled]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizing || !containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const deltaY = e.clientY - startY.current;
      const pixelPercent = (deltaY / rect.height) * 100;
      let newHeightPercent = startHeightPercent.current + pixelPercent;
      newHeightPercent = Math.max(4, Math.min(100, newHeightPercent));
      lastHeightPercent.current = newHeightPercent;
    },
    [resizing]
  );

  const handlePointerUp = useCallback(() => {
    if (!resizing) return;
    setResizing(false);
    const newHeightPercent = lastHeightPercent.current;
    const durationHours = heightPercentToHours(newHeightPercent);
    const startISO =
      workOrder.scheduled_start ?? toSlotISO(selectedDate, DAY_START_HOUR);
    const newEndISO = addHours(startISO, durationHours);
    onResizeEnd(workOrder, newEndISO);
  }, [resizing, workOrder, selectedDate, onResizeEnd]);

  if (disabled) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-end justify-center pb-0.5 group"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="slider"
      aria-label="Resize job duration"
    >
      <span className="rounded bg-[var(--card-border)] opacity-0 group-hover:opacity-100 h-1 w-8 transition-opacity" />
    </div>
  );
}

function DraggableBoardCard({
  workOrder,
  selectedDate,
  onResizeEnd,
  onOpenWorkOrder,
  children,
}: {
  workOrder: BoardWorkOrder;
  selectedDate: string;
  onResizeEnd?: (workOrder: { id: string; assigned_crew_id?: string | null; assigned_technician_id?: string | null; scheduled_date?: string | null; scheduled_start?: string | null }, newEndISO: string) => void;
  onOpenWorkOrder?: (
    id: string,
    action?: "view" | "reassign" | "complete" | "open" | "unschedule"
  ) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `board-wo-${workOrder.id}`,
    data: { type: "dispatch-work-order-board", workOrder },
  });
  const { leftPercent, widthPercent } = getWorkOrderPosition(workOrder, selectedDate);

  return (
    <div
      ref={setNodeRef}
      className="absolute left-1 right-1 z-20 pointer-events-auto"
      style={{
        top: `${leftPercent}%`,
        height: `${Math.max(widthPercent, 4)}%`,
        minHeight: "2rem",
      }}
    >
      {isDragging ? null : (
        <>
          <div
            {...listeners}
            {...attributes}
            onPointerDownCapture={(event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest("[data-dispatch-quick-action='1']")) {
                event.stopPropagation();
              }
            }}
            className="h-full cursor-grab overflow-hidden rounded-lg transition-transform duration-150 active:cursor-grabbing"
          >
            <div className="h-full overflow-auto">
              {children}
            </div>
          </div>
          {onResizeEnd && (
            <ResizeHandle
              workOrder={workOrder}
              selectedDate={selectedDate}
              currentHeightPercent={widthPercent}
              onResizeEnd={onResizeEnd}
              disabled={isDragging}
            />
          )}
        </>
      )}
    </div>
  );
}

export function DispatchBoard({
  lanes,
  workOrdersByLane,
  selectedDate,
  overDropId,
  isDraggingWorkOrder,
  view,
  workOrders,
  onSelectDate,
  onResizeEnd,
  onOpenWorkOrder,
  routeTravelByWorkOrderId,
}: DispatchBoardProps) {
  const timeLabels = useMemo(() => getTimeSlotLabels(), []);
  const dayScrollRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const nowPercent = useMemo(() => getCurrentTimePercent(now), [now]);
  const currentTime = useMemo(() => getCurrentTimeSlot(now), [now]);
  const nowLabel = useMemo(
    () => now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    [now]
  );
  useEffect(() => {
    if (view !== "day") return;
    if (nowPercent == null) return;
    const el = dayScrollRef.current;
    if (!el) return;
    const targetTop = (nowPercent / 100) * el.scrollHeight - el.clientHeight * 0.35;
    el.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  }, [selectedDate, view, nowPercent]);

  if (view === "week") {
    const weekStart = startOfWeek(selectedDate);
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const workOrdersByDate = new Map<string, BoardWorkOrder[]>();
    days.forEach((day) => workOrdersByDate.set(day, []));
    workOrders.forEach((wo) => {
      const day = wo.scheduled_date ?? "";
      if (!workOrdersByDate.has(day)) return;
      const list = workOrdersByDate.get(day) ?? [];
      list.push(wo);
      workOrdersByDate.set(day, list);
    });

    return (
      <div className="grid h-full min-h-0 gap-3 overflow-auto p-3 md:grid-cols-2 xl:grid-cols-4">
        {days.map((day) => {
          const list = workOrdersByDate.get(day) ?? [];
          const inProgress = list.filter((wo) => wo.status === "in_progress").length;
          const highPriority = list.filter((wo) =>
            ["high", "urgent", "emergency"].includes(String(wo.priority ?? "").toLowerCase())
          ).length;
          return (
            <section
              key={day}
              className="flex min-h-[240px] flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 shadow-[var(--shadow-soft)]"
            >
              <button
                type="button"
                onClick={() => onSelectDate(day)}
                className="text-left text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
              >
                {formatDayLabel(day)}
              </button>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {list.length} scheduled · {inProgress} in progress · {highPriority} high priority
              </p>
              <div className="mt-3 space-y-2">
                {list.slice(0, 4).map((wo) => (
                  <DispatchWorkOrderCard
                    key={wo.id}
                    workOrder={wo}
                    variant="compact"
                    showScheduledTime
                    showQuickActions
                    travelEstimate={routeTravelByWorkOrderId?.get(wo.id) ?? null}
                    onOpenWorkOrder={onOpenWorkOrder}
                  />
                ))}
                {list.length > 4 ? (
                  <p className="text-xs text-[var(--muted)]">+{list.length - 4} more jobs</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  if (view === "month") {
    const monthDate = new Date(`${selectedDate}T12:00:00`);
    const monthStart = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`;
    const gridStart = startOfWeek(monthStart);
    const gridDays = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
    const workOrdersByDate = new Map<string, BoardWorkOrder[]>();
    gridDays.forEach((day) => workOrdersByDate.set(day, []));
    workOrders.forEach((wo) => {
      const day = wo.scheduled_date ?? "";
      if (!workOrdersByDate.has(day)) return;
      const list = workOrdersByDate.get(day) ?? [];
      list.push(wo);
      workOrdersByDate.set(day, list);
    });

    return (
      <div className="grid h-full min-h-0 grid-cols-7 gap-px overflow-auto bg-[var(--card-border)]">
        {gridDays.map((day) => {
          const list = workOrdersByDate.get(day) ?? [];
          const isCurrentMonth = day.slice(0, 7) === selectedDate.slice(0, 7);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`min-h-[112px] bg-[var(--card)] p-2 text-left hover:bg-[var(--background)] ${
                isCurrentMonth ? "" : "opacity-60"
              }`}
            >
              <p className="text-xs font-semibold text-[var(--foreground)]">
                {new Date(`${day}T12:00:00`).getDate()}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{list.length} jobs</p>
              {list.slice(0, 2).map((wo) => (
                <p key={wo.id} className="mt-1 truncate text-xs text-[var(--foreground)]">
                  {(typeof wo.work_order_number === "string" && wo.work_order_number) ||
                    (typeof wo.title === "string" && wo.title) ||
                    "Work order"}
                </p>
              ))}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={dayScrollRef} className="flex h-full flex-col overflow-auto">
      <div className="flex shrink-0 border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="w-14 shrink-0 border-r border-[var(--card-border)] bg-slate-100/70 px-1.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Time
        </div>
        {lanes.map((lane) => {
          const displayName = lane.name ?? (lane.id === UNASSIGNED_LANE_ID ? "Unassigned" : lane.id.slice(0, 8));
          const hasRemaining = lane.remainingHours !== undefined;
          return (
            <div
              key={lane.id}
              className="min-w-[15rem] flex-1 border-r border-[var(--card-border)] bg-gradient-to-b from-slate-100/70 to-slate-50/70 px-3 py-2 last:border-r-0"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                {displayName}
              </span>
              <div className="text-xs text-[var(--muted)]">
                {(lane.total_scheduled_hours ?? 0).toFixed(1)}h scheduled
                {hasRemaining ? ` · ${Math.max(0, lane.remainingHours ?? 0).toFixed(1)}h remaining` : ` · ${lane.job_count ?? 0} jobs`}
              </div>
            </div>
          );
        })}
      </div>
      <div className="relative flex min-h-0 flex-1">
        <div className="pointer-events-none absolute right-2 top-2 z-30 rounded-full border border-red-200 bg-red-50/90 px-2 py-0.5 text-[11px] font-semibold text-red-700">
          Current time: {nowLabel}
        </div>
        <div className="flex w-14 shrink-0 flex-col border-r border-[var(--card-border)] bg-slate-100/70">
          {/* Spacer so time labels align with lane slot rows (lanes have inner header above slots) */}
          <div
            className="shrink-0 border-b border-slate-200/80 bg-slate-100/80"
            style={{ height: "60px" }}
            aria-hidden
          />
          {timeLabels.map(({ hour, label }, index) => {
            const isCurrentHour = currentTime?.hour === hour;
            return (
            <div
              key={hour}
              className={`relative flex h-[40px] items-start justify-end border-b border-slate-200/80 pr-2 pt-0.5 text-xs text-[var(--muted)] ${
                index % 2 === 0 ? "bg-slate-100/80" : "bg-slate-50/80"
              } ${isCurrentHour ? "bg-red-50/70" : ""}`}
              style={{ height: `${100 / timeLabels.length}%`, minHeight: "40px" }}
            >
              {label}
              {isCurrentHour ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500/90"
                  style={{ top: `${((currentTime?.minute ?? 0) / 60) * 100}%` }}
                />
              ) : null}
            </div>
          );
          })}
        </div>
        <div className="flex min-w-max flex-1">
          {lanes.map((lane) => {
            const displayName = lane.name ?? (lane.id === UNASSIGNED_LANE_ID ? "Individual / Unassigned" : lane.id.slice(0, 8));
            return (
            <ScheduleLane
              key={lane.id}
              id={lane.id}
              name={displayName}
              selectedDate={selectedDate}
              totalScheduledHours={lane.total_scheduled_hours ?? 0}
              jobCount={lane.job_count ?? 0}
              remainingHours={lane.remainingHours}
              overDropId={overDropId}
              isDraggingWorkOrder={isDraggingWorkOrder}
              timeLabels={timeLabels}
              currentTime={currentTime}
            >
              {(workOrdersByLane.get(lane.id) ?? []).map((wo) => (
                <DraggableBoardCard
                  key={wo.id}
                  workOrder={wo}
                  selectedDate={selectedDate}
                  onResizeEnd={onResizeEnd}
                  onOpenWorkOrder={onOpenWorkOrder}
                >
                  <DispatchWorkOrderCard
                    workOrder={wo}
                    variant="block"
                    showScheduledTime
                    showCrew
                    showQuickActions
                    travelEstimate={routeTravelByWorkOrderId?.get(wo.id) ?? null}
                    onOpenWorkOrder={onOpenWorkOrder}
                  />
                </DraggableBoardCard>
              ))}
            </ScheduleLane>
          );
          })}
        </div>
        {nowPercent !== null ? (
          <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top: `${nowPercent}%` }}>
            <div className="relative">
              <div className="absolute -top-2 left-1 z-10 flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {nowLabel}
              </div>
              <div className="h-0 border-t-[3px] border-red-500/95 shadow-[0_0_0_1px_rgba(248,113,113,0.14)]" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
