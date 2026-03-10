"use client";

import { useMemo, useRef, useCallback, useState } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import {
  getTimeSlotLabels,
  getWorkOrderPosition,
  getSlotId,
  heightPercentToHours,
  addHours,
  toSlotISO,
  DAY_START_HOUR,
  DEFAULT_AVAILABLE_HOURS,
} from "./dispatch-board-utils";
import { DispatchWorkOrderCard } from "./DispatchWorkOrderCard";
import type { DispatchViewMode } from "../filter-state";

const UNASSIGNED_LANE_ID = "__unassigned__";

/** Minimal crew shape for the board (from LoadDispatchResult.crews). */
type BoardCrew = {
  id: string;
  name?: string | null;
  scheduled_today?: unknown[];
  total_scheduled_hours?: number;
  job_count?: number;
};

/** Work order shape used by the board and getWorkOrderPosition. */
type BoardWorkOrder = {
  id: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  estimated_hours?: number | null;
  scheduled_date?: string | null;
  assigned_crew_id?: string | null;
  [key: string]: unknown;
};

export type DispatchBoardProps = {
  crews: BoardCrew[];
  selectedDate: string;
  overCrewId: string | null;
  view: DispatchViewMode;
  workOrders: BoardWorkOrder[];
  onSelectDate: (date: string) => void;
  onResizeEnd?: (workOrder: { id: string; assigned_crew_id?: string | null; scheduled_date?: string | null; scheduled_start?: string | null }, newEndISO: string) => void;
  onOpenWorkOrder?: (id: string, action?: "view" | "reassign" | "complete" | "open") => void;
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

function DroppableSlot({
  crewId,
  hour,
  selectedDate,
  isOver,
}: {
  crewId: string;
  hour: number;
  selectedDate: string;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: getSlotId(crewId, hour),
    data: { crewId, date: selectedDate, defaultHour: hour },
  });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[28px] flex-1 ${isOver ? "bg-[var(--accent)]/15" : ""}`}
    />
  );
}

function DroppableCrewColumn({
  crew,
  selectedDate,
  overCrewId,
  timeLabels,
  children,
}: {
  crew: BoardCrew;
  selectedDate: string;
  overCrewId: string | null;
  timeLabels: { hour: number; label: string }[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: `crew-${crew.id}`,
    data: {
      crewId: crew.id,
      date: selectedDate,
      defaultHour: DAY_START_HOUR,
    },
  });
  const totalHours = crew.total_scheduled_hours ?? 0;
  const remaining = Math.max(0, DEFAULT_AVAILABLE_HOURS - totalHours);
  const jobCount = crew.job_count ?? 0;
  const highlight = isOverDroppable || (overCrewId != null && String(overCrewId).startsWith(`crew-${crew.id}`));

  return (
    <div
      ref={setNodeRef}
      className={`relative flex min-w-[12rem] flex-1 flex-col border-r border-[var(--card-border)] last:border-r-0 ${
        highlight ? "bg-[var(--accent)]/10" : "bg-[var(--background)]"
      }`}
    >
      <div className="sticky top-0 z-10 shrink-0 border-b border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--foreground)]">
          {crew.name ?? `Crew ${crew.id.slice(0, 8)}`}
        </span>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
          <span>{totalHours.toFixed(1)}h scheduled</span>
          <span>{jobCount} jobs</span>
          <span>{remaining.toFixed(1)}h left</span>
        </div>
      </div>
      <div className="relative flex min-h-[320px] flex-1 flex-col">
        <div className="absolute inset-0 flex flex-col">
          {timeLabels.map(({ hour }) => (
            <DroppableSlot
              key={hour}
              crewId={crew.id}
              hour={hour}
              selectedDate={selectedDate}
              isOver={overCrewId === getSlotId(crew.id, hour)}
            />
          ))}
        </div>
        <div className="absolute inset-0 pointer-events-none">
          {children}
        </div>
      </div>
    </div>
  );
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
  onResizeEnd?: (workOrder: { id: string; assigned_crew_id?: string | null; scheduled_date?: string | null; scheduled_start?: string | null }, newEndISO: string) => void;
  onOpenWorkOrder?: (id: string, action?: "view" | "reassign" | "complete" | "open") => void;
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
            className="h-full cursor-grab active:cursor-grabbing overflow-hidden rounded-lg"
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
  crews,
  selectedDate,
  overCrewId,
  view,
  workOrders,
  onSelectDate,
  onResizeEnd,
  onOpenWorkOrder,
}: DispatchBoardProps) {
  const timeLabels = useMemo(() => getTimeSlotLabels(), []);
  const lanes = useMemo(
    () => {
      const unassignedToday = workOrders.filter((wo) => {
        const date = wo.scheduled_date ?? selectedDate;
        return date === selectedDate && !wo.assigned_crew_id;
      });
      const unassignedHours = unassignedToday.reduce(
        (sum, wo) => sum + getDurationHours(wo),
        0
      );
      return [
        {
          id: UNASSIGNED_LANE_ID,
          name: "Individual / Unassigned",
          total_scheduled_hours: Math.round(unassignedHours * 10) / 10,
          job_count: unassignedToday.length,
        },
        ...crews,
      ];
    },
    [crews, workOrders, selectedDate]
  );

  const workOrdersByCrew = useMemo(() => {
    const map = new Map<string, BoardWorkOrder[]>();
    for (const c of lanes) {
      map.set(c.id, []);
    }
    for (const wo of workOrders) {
      const date = wo.scheduled_date ?? selectedDate;
      if (date !== selectedDate) continue;
      const laneId = wo.assigned_crew_id ?? UNASSIGNED_LANE_ID;
      if (map.has(laneId)) {
        const list = map.get(laneId) ?? [];
        list.push(wo);
        map.set(laneId, list);
      }
    }
    return map;
  }, [lanes, workOrders, selectedDate]);

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
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex shrink-0 border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="w-14 shrink-0 border-r border-[var(--card-border)] py-2" aria-hidden />
        {lanes.map((crew) => (
          <div
            key={crew.id}
            className="min-w-[12rem] flex-1 border-r border-[var(--card-border)] px-3 py-2 last:border-r-0"
          >
            <span className="text-xs font-medium text-[var(--muted)]">
              {crew.name ?? `Crew ${crew.id.slice(0, 8)}`}
            </span>
            <div className="text-xs text-[var(--muted)]">
              {(crew.total_scheduled_hours ?? 0).toFixed(1)}h · {crew.job_count ?? 0} jobs
            </div>
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-14 shrink-0 border-r border-[var(--card-border)] bg-[var(--card)]/30">
          {timeLabels.map(({ hour, label }) => (
            <div
              key={hour}
              className="flex h-[40px] items-start justify-end border-b border-[var(--card-border)]/50 pr-2 pt-0.5 text-xs text-[var(--muted)]"
              style={{ height: `${100 / timeLabels.length}%`, minHeight: "40px" }}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1">
          {lanes.map((crew) => (
            <DroppableCrewColumn
              key={crew.id}
              crew={crew}
              selectedDate={selectedDate}
              overCrewId={overCrewId}
              timeLabels={timeLabels}
            >
              {(workOrdersByCrew.get(crew.id) ?? []).map((wo) => (
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
                    onOpenWorkOrder={onOpenWorkOrder}
                  />
                </DraggableBoardCard>
              ))}
            </DroppableCrewColumn>
          ))}
        </div>
      </div>
    </div>
  );
}
