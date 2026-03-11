"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { updateWorkOrderAssignment, saveWorkOrder, logDispatchRebalance } from "@/app/(authenticated)/work-orders/actions";
import { parseSlotId } from "./dispatch-board-utils";
import { DispatchTopBar } from "./DispatchTopBar";
import { DispatchSidebarQueue } from "./DispatchSidebarQueue";
import { DispatchBoard, type BoardLane } from "./DispatchBoard";
import { DispatchWorkOrderCard } from "./DispatchWorkOrderCard";
import { DispatchWorkforcePanel } from "./DispatchWorkforcePanel";
import type { DispatchWorkOrder } from "../types";
import type { LoadDispatchResult } from "../dispatch-data";
import type { DispatchFilterState } from "../filter-state";
import { filterStateToParams } from "../filter-state";
import { MetricCard } from "@/src/components/ui/metric-card";
import { Card } from "@/src/components/ui/card";
import { WorkOrderAssignmentModal } from "@/app/(authenticated)/work-orders/components/work-order-assignment-modal";
import { WorkOrderFormModal } from "@/app/(authenticated)/work-orders/components/work-order-form-modal";
import { RebalanceSuggestionsModal } from "./RebalanceSuggestionsModal";
import { computeRebalanceSuggestions } from "../rebalance-utils";
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

function normalizeStatus(value: string | null | undefined): string {
  if (!value) return "";
  if (value === "open") return "new";
  if (value === "assigned") return "ready_to_schedule";
  if (value === "closed") return "completed";
  return value;
}

function queuePriorityRank(p: string | null | undefined): number {
  const v = (p ?? "").toLowerCase();
  if (v === "emergency") return 0;
  if (v === "urgent") return 1;
  if (v === "high") return 2;
  if (v === "medium") return 3;
  if (v === "low") return 4;
  return 5;
}

function parseScheduledHours(workOrder: DispatchWorkOrder): number {
  if (workOrder.scheduled_start && workOrder.scheduled_end) {
    const start = new Date(workOrder.scheduled_start).getTime();
    const end = new Date(workOrder.scheduled_end).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return (end - start) / (60 * 60 * 1000);
    }
  }
  return workOrder.estimated_hours ?? 1;
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
  const searchParams = useSearchParams();
  const isFullScreen = searchParams.get("dispatch_fullscreen") === "1";
  const [overDropId, setOverDropId] = useState<string | null>(null);
  const [activeWo, setActiveWo] = useState<DispatchWorkOrder | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<DispatchWorkOrder | null>(null);
  const [createWorkOrderModalOpen, setCreateWorkOrderModalOpen] = useState(false);
  const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false);
  const [rebalanceApplying, setRebalanceApplying] = useState(false);
  const [queueCollapsed, setQueueCollapsed] = useState(false);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);
  const [dispatchBoardMode, setDispatchBoardMode] = useState<"technicians" | "crews">("technicians");
  const [technicianPage, setTechnicianPage] = useState(0);
  const TECHNICIAN_PAGE_SIZE = 8;
  const [optimisticWorkOrders, setOptimisticWorkOrders] = useState<DispatchWorkOrder[]>(
    initialData.workOrders
  );

  useEffect(() => {
    setOptimisticWorkOrders(initialData.workOrders);
  }, [initialData.workOrders]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queuePref = window.sessionStorage.getItem("dispatch.queue.collapsed");
    const insightsPref = window.sessionStorage.getItem("dispatch.insights.collapsed");
    if (queuePref != null) setQueueCollapsed(queuePref === "1");
    if (insightsPref != null) setInsightsCollapsed(insightsPref === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("dispatch.queue.collapsed", queueCollapsed ? "1" : "0");
  }, [queueCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("dispatch.insights.collapsed", insightsCollapsed ? "1" : "0");
  }, [insightsCollapsed]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const setFullScreen = useCallback(
    (enabled: boolean) => {
      const next = new URLSearchParams(searchParams.toString());
      if (enabled) next.set("dispatch_fullscreen", "1");
      else next.delete("dispatch_fullscreen");
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const dispatchData = useMemo(() => {
    const today = filterState.selectedDate;
    const overdue: DispatchWorkOrder[] = [];
    const ready: DispatchWorkOrder[] = [];
    const unscheduled: DispatchWorkOrder[] = [];
    const scheduledToday: DispatchWorkOrder[] = [];
    const highPriorityOpen = new Set<string>();
    const techniciansWorkingToday = new Set<string>();
    const crewsWorkingToday = new Set<string>();
    let inProgressToday = 0;
    let unassignedWorkOrders = 0;

    for (const wo of optimisticWorkOrders) {
      const scheduled = wo.scheduled_date ?? null;
      const due = wo.due_date ?? null;
      const comparableStatus = normalizeStatus(wo.status ?? "");
      const isTerminal = comparableStatus === "completed" || comparableStatus === "cancelled";
      const hasAssignment = Boolean(wo.assigned_crew_id || wo.assigned_technician_id);

      if (!hasAssignment && !isTerminal) unassignedWorkOrders += 1;
      if (comparableStatus === "in_progress") inProgressToday += 1;
      if (scheduled === today && wo.assigned_technician_id) {
        techniciansWorkingToday.add(wo.assigned_technician_id);
      }
      if (scheduled === today && wo.assigned_crew_id) {
        crewsWorkingToday.add(wo.assigned_crew_id);
      }
      if (
        !isTerminal &&
        ["high", "urgent", "emergency"].includes((wo.priority ?? "").toLowerCase())
      ) {
        highPriorityOpen.add(wo.id);
      }
      if (scheduled === today && hasAssignment) {
        scheduledToday.push(wo);
      }

      if (scheduled) continue;
      if (isTerminal) continue;

      const isOverdue = due && due < today;
      if (isOverdue) {
        overdue.push(wo);
        continue;
      }
      if (comparableStatus === "ready_to_schedule") {
        ready.push(wo);
        continue;
      }
      if (["new", "ready_to_schedule"].includes(comparableStatus)) {
        unscheduled.push(wo);
      }
    }

    const sortByPriorityThenDue = (a: DispatchWorkOrder, b: DispatchWorkOrder) => {
      const pr = queuePriorityRank(a.priority) - queuePriorityRank(b.priority);
      if (pr !== 0) return pr;
      const da = a.due_date ?? "";
      const db = b.due_date ?? "";
      return da.localeCompare(db);
    };
    overdue.sort(sortByPriorityThenDue);
    ready.sort(sortByPriorityThenDue);
    unscheduled.sort(sortByPriorityThenDue);

    return {
      overdue,
      ready,
      unscheduled,
      scheduledToday,
      insights: {
        total: optimisticWorkOrders.length,
        overdue: overdue.length,
        ready: ready.length,
        unscheduled: unscheduled.length,
        unassignedWorkOrders,
        scheduledToday: scheduledToday.length,
        inProgressToday,
        highPriorityOpenJobs: highPriorityOpen.size,
        techniciansWorkingToday: techniciansWorkingToday.size,
        crewsWorkingToday: crewsWorkingToday.size,
      },
    };
  }, [filterState.selectedDate, optimisticWorkOrders]);

  const boardCrews = useMemo(() => {
    const scheduledByCrew = new Map<string, DispatchWorkOrder[]>();
    initialData.crews.forEach((crew) => scheduledByCrew.set(crew.id, []));
    dispatchData.scheduledToday.forEach((wo) => {
      if (!wo.assigned_crew_id) return;
      const list = scheduledByCrew.get(wo.assigned_crew_id);
      if (!list) return;
      list.push(wo);
    });
    return initialData.crews.map((crew) => {
      const scheduled = scheduledByCrew.get(crew.id) ?? [];
      const total = scheduled.reduce((sum, wo) => sum + parseScheduledHours(wo), 0);
      return {
        ...crew,
        scheduled_today: scheduled,
        total_scheduled_hours: Math.round(total * 10) / 10,
        job_count: scheduled.length,
      };
    });
  }, [dispatchData.scheduledToday, initialData.crews]);

  const { lanes: boardLanes, workOrdersByLane: boardWorkOrdersByLane } = useMemo(() => {
    const selectedDate = filterState.selectedDate;
    const scheduledTodayForDate = optimisticWorkOrders.filter((wo) => (wo.scheduled_date ?? null) === selectedDate);
    const unassignedLaneId = "__unassigned__";
    const { technicians, crews: workforceCrews } = initialData.workforce;

    if (dispatchBoardMode === "technicians") {
      const start = technicianPage * TECHNICIAN_PAGE_SIZE;
      const pageTechnicians = technicians.slice(start, start + TECHNICIAN_PAGE_SIZE);
      const unassignedTech = scheduledTodayForDate.filter((wo) => !wo.assigned_technician_id);
      const unassignedHours = unassignedTech.reduce((sum, wo) => sum + parseScheduledHours(wo), 0);
      const lanes: BoardLane[] = [
        {
          id: unassignedLaneId,
          name: "Individual / Unassigned",
          total_scheduled_hours: Math.round(unassignedHours * 10) / 10,
          job_count: unassignedTech.length,
        },
        ...pageTechnicians.map((t) => ({
          id: `tech-${t.id}`,
          name: t.name,
          total_scheduled_hours: Math.round((t.workloadHoursToday ?? 0) * 10) / 10,
          job_count: t.scheduledToday ?? 0,
          remainingHours: t.availableCapacityHours ?? Math.max(0, (t.dailyCapacityHours ?? 8) - (t.workloadHoursToday ?? 0)),
        })),
      ];
      const workOrdersByLane = new Map<string, typeof optimisticWorkOrders>();
      lanes.forEach((l) => workOrdersByLane.set(l.id, []));
      scheduledTodayForDate.forEach((wo) => {
        const laneId = wo.assigned_technician_id ? `tech-${wo.assigned_technician_id}` : unassignedLaneId;
        if (workOrdersByLane.has(laneId)) {
          workOrdersByLane.get(laneId)!.push(wo);
        }
      });
      return { lanes, workOrdersByLane };
    }

    const crewWorkloadById = new Map(workforceCrews.map((c) => [c.id, c]));
    const unassignedCrew = scheduledTodayForDate.filter((wo) => !wo.assigned_crew_id);
    const unassignedHours = unassignedCrew.reduce((sum, wo) => sum + parseScheduledHours(wo), 0);
    const lanes: BoardLane[] = [
      {
        id: unassignedLaneId,
        name: "Individual / Unassigned",
        total_scheduled_hours: Math.round(unassignedHours * 10) / 10,
        job_count: unassignedCrew.length,
      },
      ...boardCrews.map((crew) => {
        const workload = crewWorkloadById.get(crew.id);
        const remaining = workload?.availableCapacityHours ?? Math.max(0, (workload?.dailyCapacityHours ?? 8) - (crew.total_scheduled_hours ?? 0));
        return {
          id: crew.id,
          name: crew.name ?? undefined,
          total_scheduled_hours: crew.total_scheduled_hours ?? 0,
          job_count: crew.job_count ?? 0,
          remainingHours: remaining,
        };
      }),
    ];
    const workOrdersByLane = new Map<string, typeof optimisticWorkOrders>();
    lanes.forEach((l) => workOrdersByLane.set(l.id, []));
    scheduledTodayForDate.forEach((wo) => {
      const laneId = wo.assigned_crew_id ?? unassignedLaneId;
      if (workOrdersByLane.has(laneId)) {
        workOrdersByLane.get(laneId)!.push(wo);
      }
    });
    return { lanes, workOrdersByLane };
  }, [
    dispatchBoardMode,
    technicianPage,
    filterState.selectedDate,
    optimisticWorkOrders,
    initialData.workforce,
    boardCrews,
  ]);

  const hasNoResults =
    optimisticWorkOrders.length === 0 &&
    dispatchData.unscheduled.length === 0 &&
    dispatchData.overdue.length === 0 &&
    dispatchData.ready.length === 0 &&
    boardCrews.every((crew) => (crew.scheduled_today?.length ?? 0) === 0);

  const rebalanceSuggestions = useMemo(() => {
    const scheduledCrewOnly = dispatchData.scheduledToday.filter(
      (wo) => wo.assigned_crew_id != null
    );
    return computeRebalanceSuggestions({
      scheduledWorkOrders: scheduledCrewOnly,
      crewWorkloads: initialData.workforce.crews,
      selectedDate: filterState.selectedDate,
      maxSuggestions: 10,
    });
  }, [
    dispatchData.scheduledToday,
    initialData.workforce.crews,
    filterState.selectedDate,
  ]);

  const applyOptimisticAssignment = useCallback(
    async (
      workOrder: DispatchWorkOrder,
      payload: {
        assigned_technician_id: string | null;
        assigned_crew_id: string | null;
        scheduled_date: string | null;
        scheduled_start: string | null;
        scheduled_end: string | null;
      },
      patch: Partial<DispatchWorkOrder>
    ) => {
      setDropError(null);
      const previous = optimisticWorkOrders;
      setOptimisticWorkOrders((current) =>
        current.map((row) => (row.id === workOrder.id ? { ...row, ...patch } : row))
      );
      const result = await updateWorkOrderAssignment(workOrder.id, payload);
      if (result?.error) {
        setOptimisticWorkOrders(previous);
        setDropError(result.error);
        return;
      }
      router.refresh();
    },
    [optimisticWorkOrders, router]
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
      const target = (over?.data.current as { target?: string } | undefined)?.target;
      if (target === "queue-unschedule") {
        setOverDropId(id ?? "queue-drop-unschedule");
        return;
      }
      if (
        id?.startsWith("crew-") ||
        id?.startsWith("week-") ||
        id?.startsWith("slot-") ||
        id?.startsWith("queue-wo-") ||
        id === "queue-drop-unschedule"
      ) {
        setOverDropId(id);
      } else {
        setOverDropId(null);
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveWo(null);
      setOverDropId(null);
      setDropError(null);

      const { active, over } = event;
      if (!over) return;

      const overId = String(over.id);
      const dropData = over.data.current as
        | { crewId?: string; date?: string; defaultHour?: number; target?: string }
        | undefined;
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

      const data = active.data.current;
      const workOrder: DispatchWorkOrder | undefined =
        data?.type === "dispatch-work-order"
          ? (data.workOrder as DispatchWorkOrder)
          : data?.type === "dispatch-work-order-board"
            ? (data.workOrder as DispatchWorkOrder)
            : undefined;

      if (!workOrder) return;

      const isQueueUnscheduleTarget =
        dropData?.target === "queue-unschedule" ||
        overId === "queue-drop-unschedule" ||
        overId.startsWith("queue-wo-");

      if (isQueueUnscheduleTarget) {
        const normalized = normalizeStatus(workOrder.status ?? "");
        const optimisticStatus =
          normalized === "completed" || normalized === "cancelled"
            ? workOrder.status ?? normalized
            : "ready_to_schedule";
        await applyOptimisticAssignment(
          workOrder,
          {
            assigned_technician_id: null,
            assigned_crew_id: null,
            scheduled_date: null,
            scheduled_start: null,
            scheduled_end: null,
          },
          {
            assigned_technician_id: null,
            assigned_crew_id: null,
            assigned_technician_name: null,
            assigned_crew_name: null,
            assignment_type: "unassigned",
            scheduled_date: null,
            scheduled_start: null,
            scheduled_end: null,
            status: optimisticStatus,
          }
        );
        return;
      }

      if (!crewId || !dropDate) return;

      const startISO = toSlotISO(dropDate, defaultHour);
      const hours = workOrder.estimated_hours ?? 1;
      const endISO = addHours(startISO, hours);
      const isTechnicianDrop = crewId.startsWith("tech-");
      const assignedTechnicianId = isTechnicianDrop ? crewId.slice(5) : null;
      const assignedCrewId = crewId === "__unassigned__" || isTechnicianDrop ? null : crewId;
      const techName =
        assignedTechnicianId != null
          ? initialData.workforce.technicians.find((t) => t.id === assignedTechnicianId)?.name ?? null
          : null;
      const crewName =
        assignedCrewId != null ? initialData.crews.find((c) => c.id === assignedCrewId)?.name ?? null : null;

      await applyOptimisticAssignment(
        workOrder,
        {
          assigned_technician_id: assignedTechnicianId,
          assigned_crew_id: assignedCrewId,
          scheduled_date: dropDate,
          scheduled_start: startISO,
          scheduled_end: endISO,
        },
        {
          assigned_technician_id: assignedTechnicianId,
          assigned_crew_id: assignedCrewId,
          assigned_technician_name: techName ?? undefined,
          assigned_crew_name: crewName ?? undefined,
          assignment_type: assignedTechnicianId ? "technician" : assignedCrewId ? "crew" : "unassigned",
          scheduled_date: dropDate,
          scheduled_start: startISO,
          scheduled_end: endISO,
          status: "scheduled",
        }
      );
    },
    [applyOptimisticAssignment, filterState.selectedDate, initialData.workforce.technicians, initialData.crews]
  );

  const handleDragCancel = useCallback(() => {
    setActiveWo(null);
    setOverDropId(null);
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
      workOrder: {
        id: string;
        assigned_crew_id?: string | null;
        assigned_technician_id?: string | null;
        scheduled_date?: string | null;
        scheduled_start?: string | null;
      },
      newEndISO: string
    ) => {
      const match = optimisticWorkOrders.find((row) => row.id === workOrder.id);
      if (!match) return;
      await applyOptimisticAssignment(
        match,
        {
          assigned_technician_id: match.assigned_technician_id ?? null,
          assigned_crew_id: match.assigned_crew_id ?? null,
          scheduled_date: workOrder.scheduled_date ?? null,
          scheduled_start: workOrder.scheduled_start ?? null,
          scheduled_end: newEndISO,
        },
        { scheduled_end: newEndISO }
      );
    },
    [applyOptimisticAssignment, optimisticWorkOrders]
  );

  const handleOpenWorkOrder = useCallback(
    async (id: string, action?: "view" | "reassign" | "complete" | "open" | "unschedule") => {
      if (action === "reassign") {
        const match = optimisticWorkOrders.find((row) => row.id === id) ?? null;
        setAssignmentTarget(match);
        return;
      }
      if (action === "unschedule") {
        const workOrder = optimisticWorkOrders.find((row) => row.id === id);
        if (!workOrder) return;
        const normalized = normalizeStatus(workOrder.status ?? "");
        const optimisticStatus =
          normalized === "completed" || normalized === "cancelled"
            ? workOrder.status ?? normalized
            : "ready_to_schedule";
        await applyOptimisticAssignment(
          workOrder,
          {
            assigned_technician_id: null,
            assigned_crew_id: null,
            scheduled_date: null,
            scheduled_start: null,
            scheduled_end: null,
          },
          {
            assigned_technician_id: null,
            assigned_crew_id: null,
            assigned_technician_name: null,
            assigned_crew_name: null,
            assignment_type: "unassigned",
            scheduled_date: null,
            scheduled_start: null,
            scheduled_end: null,
            status: optimisticStatus,
          }
        );
        return;
      }
      if (action === "complete") {
        router.push(`/work-orders/${id}?complete=1`);
        return;
      }
      router.push(`/work-orders/${id}`);
    },
    [applyOptimisticAssignment, optimisticWorkOrders, router]
  );

  const { filterOptions, error, workforce } = initialData;

  const createFormOptions = useMemo(() => {
    return {
      companies: filterOptions.companies,
      customers: [] as { id: string; name: string; company_id: string }[],
      properties: filterOptions.properties.map((p) => ({
        id: p.id,
        name: (p.property_name ?? p.name ?? p.id) as string,
        company_id: p.company_id,
      })),
      buildings: [] as { id: string; name: string; property_id: string }[],
      units: [] as { id: string; name: string; building_id: string }[],
      assets: filterOptions.assets
        .filter((a) => a.company_id != null)
        .map((a) => ({
          id: a.id,
          name: a.name,
          company_id: a.company_id as string,
          property_id: (a as { property_id?: string | null }).property_id ?? null,
          building_id: (a as { building_id?: string | null }).building_id ?? null,
          unit_id: (a as { unit_id?: string | null }).unit_id ?? null,
        })),
      technicians: filterOptions.technicians,
      crews: filterOptions.crews.map((c) => ({
        id: c.id,
        name: c.name,
        company_id: (c.company_id ?? null) as string | null,
      })),
    };
  }, [filterOptions]);

  const handleCreateWorkOrder = useCallback(() => {
    setCreateWorkOrderModalOpen(true);
  }, []);

  const handleAssignUnscheduled = useCallback(() => {
    setQueueCollapsed(false);
    const first =
      dispatchData.overdue[0] ??
      dispatchData.ready[0] ??
      dispatchData.unscheduled[0] ??
      null;
    if (first) setAssignmentTarget(first);
  }, [dispatchData.overdue, dispatchData.ready, dispatchData.unscheduled]);

  const handleRebalance = useCallback(() => {
    setRebalanceModalOpen(true);
  }, []);

  const handleRebalanceApply = useCallback(async () => {
    if (rebalanceSuggestions.length === 0) return;
    setRebalanceApplying(true);
    setDropError(null);
    const movedIds: string[] = [];
    let companyId: string | null = null;
    for (const s of rebalanceSuggestions) {
      const wo = optimisticWorkOrders.find((row) => row.id === s.workOrderId);
      if (wo) companyId = wo.company_id ?? null;
      const result = await updateWorkOrderAssignment(s.workOrderId, {
        assigned_technician_id: null,
        assigned_crew_id: s.toCrewId,
        scheduled_date: s.scheduledDate,
        scheduled_start: s.scheduledStart,
        scheduled_end: s.scheduledEnd,
      });
      if (result?.error) {
        setDropError(result.error);
        setRebalanceApplying(false);
        return;
      }
      movedIds.push(s.workOrderId);
    }
    if (movedIds.length > 0) {
      await logDispatchRebalance(
        movedIds,
        filterState.selectedDate,
        companyId
      );
    }
    setRebalanceApplying(false);
    setRebalanceModalOpen(false);
    router.refresh();
  }, [
    rebalanceSuggestions,
    optimisticWorkOrders,
    filterState.selectedDate,
    router,
  ]);

  return (
    <div className={`flex h-full min-h-0 flex-col ${isFullScreen ? "gap-2" : "gap-4"}`}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Dispatch Operations Board
          </h1>
          {!isFullScreen ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Assign to technicians or crews, schedule by day/week/month, and balance workload.
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Full screen command center mode enabled.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isFullScreen ? (
            <>
              <Link href="/work-orders">
                <Button variant="secondary">Open Work Orders</Button>
              </Link>
              <Link href="/technicians/work-queue">
                <Button>Technician Queue</Button>
              </Link>
            </>
          ) : null}
          <Button variant={isFullScreen ? "secondary" : "primary"} onClick={() => setFullScreen(!isFullScreen)}>
            {isFullScreen ? "Exit Full Screen" : "⛶ Full Screen"}
          </Button>
        </div>
      </header>

      {!isFullScreen ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Unassigned Work Orders"
            value={dispatchData.insights.unassignedWorkOrders}
            description="Needs technician or crew assignment"
          />
          <MetricCard
            title="Scheduled Today"
            value={dispatchData.insights.scheduledToday}
            description="With assignment and schedule"
          />
          <MetricCard
            title="In Progress Today"
            value={dispatchData.insights.inProgressToday}
            description="Active execution jobs"
          />
          <MetricCard
            title="Overdue Work Orders"
            value={dispatchData.insights.overdue}
            description="Past due without completion"
            className="border-red-200/80 bg-red-50/50"
            trend={
              dispatchData.insights.overdue > 0
                ? { label: "Requires immediate attention", tone: "bad" }
                : { label: "No overdue jobs", tone: "good" }
            }
          />
          <MetricCard
            title="High Priority Open Jobs"
            value={dispatchData.insights.highPriorityOpenJobs}
            description="High, urgent, and emergency work"
            className="border-amber-200/80 bg-amber-50/40"
            trend={
              dispatchData.insights.highPriorityOpenJobs > 0
                ? { label: "Prioritize dispatch now", tone: "bad" }
                : { label: "Priority backlog controlled", tone: "good" }
            }
          />
          <MetricCard
            title="Technicians Working Today"
            value={dispatchData.insights.techniciansWorkingToday}
            description="Unique technicians scheduled today"
          />
          <MetricCard
            title="Crews Working Today"
            value={dispatchData.insights.crewsWorkingToday}
            description="Unique crews scheduled today"
          />
        </section>
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DispatchTopBar
          filterState={filterState}
          filterOptions={filterOptions}
          insights={dispatchData.insights}
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
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <DispatchSidebarQueue
              unscheduled={dispatchData.unscheduled}
              overdue={dispatchData.overdue}
              ready={dispatchData.ready}
              collapsed={queueCollapsed}
              overDropId={overDropId}
              isDraggingWorkOrder={Boolean(activeWo)}
              onToggleCollapse={() => setQueueCollapsed((current) => !current)}
              onOpenWorkOrder={handleOpenWorkOrder}
            />
            <main
              className={`min-w-0 flex-1 bg-[var(--background)] ${
                queueCollapsed ? "" : "border-l border-[var(--card-border)]"
              }`}
            >
              <div className="flex h-full min-h-0 flex-col">
                {filterState.viewMode === "day" ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--card-border)] bg-[var(--card)]/50 px-3 py-2">
                    <span className="text-xs font-medium text-[var(--muted)]">Dispatch View:</span>
                    <div className="flex rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-0.5">
                      <button
                        type="button"
                        onClick={() => setDispatchBoardMode("technicians")}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          dispatchBoardMode === "technicians"
                            ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                            : "text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        Technicians
                      </button>
                      <button
                        type="button"
                        onClick={() => setDispatchBoardMode("crews")}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          dispatchBoardMode === "crews"
                            ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                            : "text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        Crews
                      </button>
                    </div>
                    {dispatchBoardMode === "technicians" &&
                      initialData.workforce.technicians.length > TECHNICIAN_PAGE_SIZE && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTechnicianPage((p) => Math.max(0, p - 1))}
                          disabled={technicianPage === 0}
                          className="rounded border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-sm font-medium text-[var(--foreground)] disabled:opacity-50"
                          aria-label="Previous page"
                        >
                          ←
                        </button>
                        <span className="text-xs text-[var(--muted)]">
                          Technicians {technicianPage * TECHNICIAN_PAGE_SIZE + 1}–
                          {Math.min((technicianPage + 1) * TECHNICIAN_PAGE_SIZE, initialData.workforce.technicians.length)} of{" "}
                          {initialData.workforce.technicians.length}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTechnicianPage((p) =>
                              Math.min(p + 1, Math.ceil(initialData.workforce.technicians.length / TECHNICIAN_PAGE_SIZE) - 1)
                            )
                          }
                          disabled={
                            technicianPage >=
                            Math.ceil(initialData.workforce.technicians.length / TECHNICIAN_PAGE_SIZE) - 1
                          }
                          className="rounded border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-sm font-medium text-[var(--foreground)] disabled:opacity-50"
                          aria-label="Next page"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
                {filterState.viewMode === "day" &&
                  dispatchBoardMode === "technicians" &&
                  initialData.workforce.technicians.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center border-b border-[var(--card-border)] bg-[var(--card)]/30 px-4 py-8">
                    <p className="text-sm font-medium text-[var(--muted)]">
                      No technicians available. Add technicians to begin scheduling.
                    </p>
                  </div>
                ) : (
                  <div className="min-h-0 flex-1">
                    <DispatchBoard
                      lanes={boardLanes}
                      workOrdersByLane={boardWorkOrdersByLane}
                      selectedDate={filterState.selectedDate}
                      overDropId={overDropId}
                      isDraggingWorkOrder={Boolean(activeWo)}
                      view={filterState.viewMode}
                      workOrders={optimisticWorkOrders}
                      onSelectDate={handleSelectDate}
                      onResizeEnd={handleResizeEnd}
                      onOpenWorkOrder={handleOpenWorkOrder}
                    />
                  </div>
                )}
              </div>
            </main>

            <DragOverlay
              modifiers={[snapCenterToCursor]}
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
          {insightsCollapsed ? (
            <aside className="hidden w-12 shrink-0 flex-col items-center justify-between border-l border-[var(--card-border)] bg-[var(--background)]/60 py-3 xl:flex">
              <button
                type="button"
                onClick={() => setInsightsCollapsed(false)}
                className="rounded-md border border-[var(--card-border)] bg-[var(--card)] px-1.5 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-border)]/35"
                aria-label="Expand workload insights"
              >
                &lt;
              </button>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] [writing-mode:vertical-rl]">
                Insights
              </span>
              <span />
            </aside>
          ) : (
            <aside className="hidden w-[380px] shrink-0 border-l border-[var(--card-border)] bg-[var(--background)]/40 p-3 xl:block">
              <div className="sticky top-3 flex h-[calc(100vh-7.75rem)] min-h-[560px] flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]/85 p-3 shadow-[var(--shadow-soft)]">
                <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    Workload Insights
                  </p>
                  <button
                    type="button"
                    onClick={() => setInsightsCollapsed(true)}
                    className="rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]/35"
                  >
                    Collapse
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <DispatchWorkforcePanel
                    workforce={workforce}
                    insights={dispatchData.insights}
                    onCreateWorkOrder={handleCreateWorkOrder}
                    onAssignUnscheduled={handleAssignUnscheduled}
                    onRebalance={handleRebalance}
                  />
                </div>
              </div>
            </aside>
          )}
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
        crews={boardCrews.map((crew) => ({
          id: crew.id,
          name: crew.name ?? "Unnamed crew",
          company_id: crew.company_id ?? null,
        }))}
        onSuccess={() => router.refresh()}
      />

      <WorkOrderFormModal
        open={createWorkOrderModalOpen}
        onClose={() => {
          setCreateWorkOrderModalOpen(false);
          router.refresh();
        }}
        workOrder={null}
        prefill={null}
        companies={createFormOptions.companies}
        customers={createFormOptions.customers}
        properties={createFormOptions.properties}
        buildings={createFormOptions.buildings}
        units={createFormOptions.units}
        assets={createFormOptions.assets}
        technicians={createFormOptions.technicians}
        crews={createFormOptions.crews}
        saveAction={saveWorkOrder}
      />

      <RebalanceSuggestionsModal
        open={rebalanceModalOpen}
        onClose={() => setRebalanceModalOpen(false)}
        suggestions={rebalanceSuggestions}
        onApply={handleRebalanceApply}
        isApplying={rebalanceApplying}
      />
    </div>
  );
}
