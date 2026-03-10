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
import { DispatchWorkforcePanel } from "./DispatchWorkforcePanel";
import type { DispatchWorkOrder } from "../types";
import type { LoadDispatchResult } from "../dispatch-data";
import type { DispatchFilterState } from "../filter-state";
import { filterStateToParams } from "../filter-state";
import { MetricCard } from "@/src/components/ui/metric-card";
import { Card } from "@/src/components/ui/card";
import { WorkOrderAssignmentModal } from "@/app/(authenticated)/work-orders/components/work-order-assignment-modal";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";

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
  const [assignmentTarget, setAssignmentTarget] = useState<DispatchWorkOrder | null>(null);

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
      const assignedCrewId = crewId === "__unassigned__" ? null : crewId;

      const result = await updateWorkOrderAssignment(workOrder.id, {
        assigned_technician_id: null,
        assigned_crew_id: assignedCrewId,
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
    (id: string, action?: "view" | "reassign" | "complete" | "open") => {
      if (action === "reassign") {
        const match = initialData.workOrders.find((row) => row.id === id) ?? null;
        setAssignmentTarget(match);
        return;
      }
      if (action === "complete") {
        router.push(`/work-orders/${id}?complete=1`);
        return;
      }
      router.push(`/work-orders/${id}`);
    },
    [router, initialData.workOrders]
  );

  const { crews, unscheduled, overdue, ready, filterOptions, insights, error, workOrders, workforce } =
    initialData;

  const hasNoResults =
    workOrders.length === 0 &&
    unscheduled.length === 0 &&
    overdue.length === 0 &&
    ready.length === 0 &&
    crews.every((c) => (c.scheduled_today?.length ?? 0) === 0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Dispatch Operations Board
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Assign to technicians or crews, schedule by day/week/month, and balance workload.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/work-orders">
            <Button variant="secondary">Open Work Orders</Button>
          </Link>
          <Link href="/technicians/work-queue">
            <Button>Technician Queue</Button>
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Unassigned Work Orders"
          value={insights.unassignedWorkOrders}
          description="Needs technician or crew assignment"
        />
        <MetricCard title="Scheduled Today" value={insights.scheduledToday} description="With assignment and schedule" />
        <MetricCard title="In Progress Today" value={insights.inProgressToday} description="Active execution jobs" />
        <MetricCard
          title="Overdue Work Orders"
          value={insights.overdue}
          description="Past due without completion"
          className="border-red-200/80 bg-red-50/50"
          trend={
            insights.overdue > 0
              ? { label: "Requires immediate attention", tone: "bad" }
              : { label: "No overdue jobs", tone: "good" }
          }
        />
        <MetricCard
          title="High Priority Open Jobs"
          value={insights.highPriorityOpenJobs}
          description="High, urgent, and emergency work"
          className="border-amber-200/80 bg-amber-50/40"
          trend={
            insights.highPriorityOpenJobs > 0
              ? { label: "Prioritize dispatch now", tone: "bad" }
              : { label: "Priority backlog controlled", tone: "good" }
          }
        />
        <MetricCard
          title="Technicians Working Today"
          value={insights.techniciansWorkingToday}
          description="Unique technicians scheduled today"
        />
        <MetricCard title="Crews Working Today" value={insights.crewsWorkingToday} description="Unique crews scheduled today" />
      </section>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
            <main className="min-w-0 flex-1 border-l border-[var(--card-border)] bg-[var(--background)]">
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

            <DragOverlay
              dropAnimation={{
                duration: 180,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
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

          <aside className="hidden w-[420px] shrink-0 border-l border-[var(--card-border)] bg-[var(--background)]/40 p-3 xl:block">
            <DispatchWorkforcePanel workforce={workforce} />
          </aside>
        </div>
      </Card>

      <WorkOrderAssignmentModal
        open={Boolean(assignmentTarget)}
        onClose={() => setAssignmentTarget(null)}
        workOrderId={assignmentTarget?.id ?? ""}
        workOrderStatus={(assignmentTarget?.status as string | undefined) ?? undefined}
        companyId={(assignmentTarget?.company_id as string | null | undefined) ?? null}
        initial={{
          assigned_technician_id:
            (assignmentTarget?.assigned_technician_id as string | null | undefined) ?? null,
          assigned_crew_id:
            (assignmentTarget?.assigned_crew_id as string | null | undefined) ?? null,
          scheduled_date:
            (assignmentTarget?.scheduled_date as string | null | undefined) ?? null,
          scheduled_start:
            (assignmentTarget?.scheduled_start as string | null | undefined) ?? null,
          scheduled_end:
            (assignmentTarget?.scheduled_end as string | null | undefined) ?? null,
        }}
        technicians={filterOptions.technicians}
        crews={crews.map((crew) => ({
          id: crew.id,
          name: crew.name ?? "Unnamed crew",
          company_id: crew.company_id ?? null,
        }))}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
