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
  onResizeEnd,
  onOpenWorkOrder,
}: DispatchBoardProps) {
  const timeLabels = useMemo(() => getTimeSlotLabels(), []);

  const workOrdersByCrew = useMemo(() => {
    const map = new Map<string, BoardWorkOrder[]>();
    for (const c of crews) {
      map.set(c.id, []);
    }
    for (const wo of workOrders) {
      const date = wo.scheduled_date ?? selectedDate;
      if (date !== selectedDate) continue;
      const crewId = wo.assigned_crew_id ?? null;
      if (crewId) {
        const list = map.get(crewId) ?? [];
        list.push(wo);
        map.set(crewId, list);
      }
    }
    return map;
  }, [crews, workOrders, selectedDate]);

  if (view !== "day") {
    return (
      <div className="flex h-full items-center justify-center p-8 text-[var(--muted)]">
        <p className="text-sm">Week and month views are not implemented yet. Use day view.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex shrink-0 border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="w-14 shrink-0 border-r border-[var(--card-border)] py-2" aria-hidden />
        {crews.map((crew) => (
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
          {crews.map((crew) => (
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
