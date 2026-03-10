"use client";

import { useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { updateWorkOrderAssignment } from "@/app/(authenticated)/work-orders/actions";
import { parseSlotId } from "./dispatch-board-utils";
import { DispatchTopBar } from "./DispatchTopBar";
import { DispatchSidebarQueue } from "./DispatchSidebarQueue";
import { DispatchBoard } from "./DispatchBoard";
import { DispatchWorkOrderCard } from "./DispatchWorkOrderCard";
import type { DispatchWorkOrder } from "../types";
import type { LoadDispatchResult } from "../dispatch-data";
import type { DispatchFilterState } from "../filter-state";
import { filterStateToParams } from "../filter-state";

function toSlotISO(dateStr: string, hour: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function addHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

type DispatchViewProps = {
  initialData: LoadDispatchResult;
  filterState: DispatchFilterState;
};

export function DispatchView({
  initialData,
  filterState,
}: DispatchViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [overCrewId, setOverCrewId] = useState<string | null>(null);
  const [activeWo, setActiveWo] = useState<DispatchWorkOrder | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === "dispatch-work-order" && data.workOrder) {
      setActiveWo(data.workOrder as DispatchWorkOrder);
    }
    if (data?.type === "dispatch-work-order-board" && data.workOrder) {
      setActiveWo(data.workOrder as DispatchWorkOrder);
    }
  }, []);

  const handleDragOver = useCallback(
    (event: import("@dnd-kit/core").DragOverEvent) => {
      const over = event.over;
      const id = over?.id != null ? String(over.id) : null;
      if (id?.startsWith("crew-") || id?.startsWith("week-") || id?.startsWith("slot-")) {
        setOverCrewId(id);
      } else {
        setOverCrewId(null);
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveWo(null);
      setOverCrewId(null);
      setDropError(null);

      const { active, over } = event;
      if (!over) return;

      const overId = String(over.id);
      const dropData = over.data.current as { crewId?: string; date?: string; defaultHour?: number } | undefined;
      let crewId = dropData?.crewId ?? (overId.startsWith("crew-") ? overId.slice("crew-".length) : null);
      let dropDate = dropData?.date ?? (overId.startsWith("crew-") ? filterState.selectedDate : null);
      let defaultHour = dropData?.defaultHour ?? 8;

      if (overId.startsWith("slot-")) {
        const parsed = parseSlotId(overId);
        if (parsed) {
          crewId = parsed.crewId;
          defaultHour = parsed.hour;
          dropDate = dropData?.date ?? filterState.selectedDate;
        }
      }

      if (!crewId || !dropDate) return;

      const data = active.data.current;
      const workOrder: DispatchWorkOrder | undefined =
        data?.type === "dispatch-work-order"
          ? (data.workOrder as DispatchWorkOrder)
          : data?.type === "dispatch-work-order-board"
            ? (data.workOrder as DispatchWorkOrder)
            : undefined;

      if (!workOrder) return;

      const startISO = toSlotISO(dropDate, defaultHour);
      const hours = workOrder.estimated_hours ?? 1;
      const endISO = addHours(startISO, hours);

      const result = await updateWorkOrderAssignment(workOrder.id, {
        assigned_technician_id: null,
        assigned_crew_id: crewId,
        scheduled_date: dropDate,
        scheduled_start: startISO,
        scheduled_end: endISO,
      });

      if (result?.error) {
        setDropError(result.error);
        return;
      }
      router.refresh();
    },
    [filterState.selectedDate, router]
  );

  const handleDragCancel = useCallback(() => {
    setActiveWo(null);
    setOverCrewId(null);
  }, []);

  const handleSelectDate = useCallback(
    (date: string) => {
      const next: DispatchFilterState = { ...filterState, selectedDate: date, viewMode: "day" };
      const params = filterStateToParams(next);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, filterState]
  );

  const handleResizeEnd = useCallback(
    async (
      workOrder: { id: string; assigned_crew_id?: string | null; scheduled_date?: string | null; scheduled_start?: string | null },
      newEndISO: string
    ) => {
      setDropError(null);
      const result = await updateWorkOrderAssignment(workOrder.id, {
        assigned_technician_id: null,
        assigned_crew_id: workOrder.assigned_crew_id ?? null,
        scheduled_date: workOrder.scheduled_date ?? null,
        scheduled_start: workOrder.scheduled_start ?? null,
        scheduled_end: newEndISO,
      });
      if (result?.error) setDropError(result.error);
      else router.refresh();
    },
    [router]
  );

  const handleOpenWorkOrder = useCallback(
    (id: string) => {
      router.push(`/work-orders/${id}`);
    },
    [router]
  );

  const { crews, unscheduled, overdue, ready, filterOptions, insights, error, workOrders } = initialData;

  const hasNoResults =
    workOrders.length === 0 &&
    unscheduled.length === 0 &&
    overdue.length === 0 &&
    ready.length === 0 &&
    crews.every((c) => (c.scheduled_today?.length ?? 0) === 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DispatchTopBar
        filterState={filterState}
        filterOptions={filterOptions}
        insights={insights}
      />

      {error && (
        <div className="border-b border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
          {error}
        </div>
      )}
      {dropError && (
        <div className="border-b border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {dropError}
        </div>
      )}

      {hasNoResults && (
        <div className="border-b border-[var(--card-border)] bg-[var(--card)]/30 px-4 py-6 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">
            No work orders match current filters
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Try changing filters or date, or clear filters to see all work orders.
          </p>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <DispatchSidebarQueue
            unscheduled={unscheduled}
            overdue={overdue}
            ready={ready}
            onOpenWorkOrder={handleOpenWorkOrder}
          />
          <main className="min-w-0 flex-1 border-l border-[var(--card-border)] bg-[var(--background)] pl-4">
            <div className="h-full min-h-0">
              <DispatchBoard
                crews={crews}
                selectedDate={filterState.selectedDate}
                overCrewId={overCrewId}
                view={filterState.viewMode}
                workOrders={workOrders}
                onSelectDate={handleSelectDate}
                onResizeEnd={handleResizeEnd}
                onOpenWorkOrder={handleOpenWorkOrder}
              />
            </div>
          </main>

          <DragOverlay dropAnimation={null}>
            {activeWo ? (
              <div className="min-w-[10rem] max-w-[14rem] cursor-grabbing opacity-95 shadow-xl">
                <DispatchWorkOrderCard
                  workOrder={activeWo}
                  variant="block"
                  showScheduledTime
                  isDragging
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
