"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import {
  updateWorkOrderAssignment,
  saveWorkOrder,
  logDispatchRebalance,
  type WorkOrderAssignmentSnapshot,
} from "@/app/(authenticated)/work-orders/actions";
import { parseSlotId } from "./dispatch-board-utils";
import { DispatchTopBar } from "./DispatchTopBar";
import { DispatchSidebarQueue } from "./DispatchSidebarQueue";
import { DispatchBoard, type BoardLane } from "./DispatchBoard";
import { DispatchOperationsJobList } from "./DispatchOperationsJobList";
import { DispatchWorkOrderDrawer } from "./DispatchWorkOrderDrawer";
import { DispatchWorkOrderCard } from "./DispatchWorkOrderCard";
import type { DispatchWorkOrder } from "../types";
import type { LoadDispatchResult } from "../dispatch-data";
import type { DispatchFilterState } from "../filter-state";
import { filterStateToParams } from "../filter-state";
import { WorkOrderAssignmentModal } from "@/app/(authenticated)/work-orders/components/work-order-assignment-modal";
import { WorkOrderFormModal } from "@/app/(authenticated)/work-orders/components/work-order-form-modal";
import { RebalanceSuggestionsModal } from "./RebalanceSuggestionsModal";
import { computeRebalanceSuggestions } from "../rebalance-utils";
import { buildTechnicianRoute, haversineMiles, estimateTravelMinutes, hasCoordinate } from "../dispatch-map-utils";
import { normalizeStatus as normalizeWorkOrderStatus } from "@/src/lib/work-orders/status";
import { SuggestedTechniciansPanel } from "./SuggestedTechniciansPanel";
import { DispatchSpeedActions } from "./DispatchSpeedActions";
import { CombinedWorkOrderDetailsPanel } from "./CombinedWorkOrderDetailsPanel";
import type { WorkOrderTravelInfo } from "./DispatchOperationsJobList";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { HelpDrawer } from "@/src/components/ui/help-drawer";
import { HelpTriggerButton } from "@/src/components/ui/help-trigger-button";
import { Hint } from "@/src/components/ui/hint";
import { useGuidance } from "@/hooks/useGuidance";
import { useGetStartedOnboarding } from "@/hooks/useGetStartedOnboarding";
import { toDateOnlyString } from "@/src/lib/date-utils";

const DispatchMapPanel = dynamic(
  () => import("./DispatchMapPanel").then((module) => module.DispatchMapPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[500px] items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)]/70 text-sm text-[var(--muted)]">
        Loading dispatch map…
      </div>
    ),
  }
);

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

function parseUpdatedAtMs(value: unknown): number {
  if (value == null || value === "") return 0;
  const t = new Date(String(value)).getTime();
  return Number.isFinite(t) ? t : 0;
}

function normalizeDispatchWorkOrderDates(w: DispatchWorkOrder): DispatchWorkOrder {
  return {
    ...w,
    scheduled_date: toDateOnlyString(w.scheduled_date) ?? w.scheduled_date ?? null,
    due_date: toDateOnlyString(w.due_date as string | null | undefined) ?? w.due_date ?? null,
  };
}

/**
 * Merge RSC payload with client rows. If the refreshed snapshot is older than the client row
 * (stale `updated_at` right after a mutation), keep dispatch fields from the client.
 * Client-only ids are appended so jobs not yet in the server list are not dropped.
 */
function mergeWorkOrdersFromServer(prev: DispatchWorkOrder[], server: DispatchWorkOrder[]): DispatchWorkOrder[] {
  const prevById = new Map(prev.map((row) => [row.id, row]));
  const serverIds = new Set(server.map((w) => w.id));

  const mergedFromServer = server.map((w) => {
    const normalized = normalizeDispatchWorkOrderDates(w);
    const p = prevById.get(w.id);
    if (!p) return normalized;

    const serverMs = parseUpdatedAtMs(w.updated_at);
    const prevMs = parseUpdatedAtMs(p.updated_at);

    if (prevMs > serverMs) {
      return {
        ...normalized,
        assigned_technician_id: p.assigned_technician_id ?? normalized.assigned_technician_id,
        assigned_crew_id: p.assigned_crew_id ?? normalized.assigned_crew_id,
        vendor_id: p.vendor_id ?? normalized.vendor_id,
        scheduled_date: p.scheduled_date ?? normalized.scheduled_date,
        scheduled_start: p.scheduled_start ?? normalized.scheduled_start,
        scheduled_end: p.scheduled_end ?? normalized.scheduled_end,
        status: p.status ?? normalized.status,
        assignment_type: p.assignment_type ?? normalized.assignment_type,
        assigned_technician_name: p.assigned_technician_name ?? normalized.assigned_technician_name,
        assigned_crew_name: p.assigned_crew_name ?? normalized.assigned_crew_name,
        vendor_name: p.vendor_name ?? normalized.vendor_name,
        updated_at: p.updated_at ?? normalized.updated_at,
      };
    }
    return normalized;
  });

  const out = [...mergedFromServer];
  for (const w of prev) {
    if (!serverIds.has(w.id)) out.push(w);
  }
  return out;
}

/** Demo workspace is read-only on the server; build a snapshot so the same merge path as real saves runs locally. */
function demoAssignmentSnapshotFromPayload(
  workOrder: DispatchWorkOrder,
  payload: {
    assigned_technician_id: string | null;
    assigned_crew_id: string | null;
    assigned_vendor_id?: string | null;
    scheduled_date: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
  },
  patch: Partial<DispatchWorkOrder>
): WorkOrderAssignmentSnapshot {
  const merged = { ...workOrder, ...patch };
  const updatedAt = new Date().toISOString();
  return {
    id: workOrder.id,
    assigned_technician_id: payload.assigned_technician_id ?? null,
    assigned_crew_id: payload.assigned_crew_id ?? null,
    vendor_id: payload.assigned_vendor_id ?? (merged.vendor_id as string | null | undefined) ?? null,
    scheduled_date: payload.scheduled_date,
    scheduled_start: payload.scheduled_start,
    scheduled_end: payload.scheduled_end,
    status: (patch.status as string | null | undefined) ?? merged.status ?? null,
    updated_at: updatedAt,
  };
}

function applyAssignmentSnapshotToRow(
  base: DispatchWorkOrder,
  snap: WorkOrderAssignmentSnapshot,
  technicians: { id: string; name?: string | null }[],
  crews: { id: string; name?: string | null }[]
): DispatchWorkOrder {
  const techId = snap.assigned_technician_id;
  const crewId = snap.assigned_crew_id;
  const techName = techId ? technicians.find((t) => t.id === techId)?.name ?? null : null;
  const crewName = crewId ? crews.find((c) => c.id === crewId)?.name ?? null : null;
  const scheduledDate = toDateOnlyString(snap.scheduled_date) ?? snap.scheduled_date ?? null;
  const assignment_type: DispatchWorkOrder["assignment_type"] = techId
    ? "technician"
    : crewId
      ? "crew"
      : snap.vendor_id
        ? "vendor"
        : "unassigned";
  return {
    ...base,
    assigned_technician_id: snap.assigned_technician_id,
    assigned_crew_id: snap.assigned_crew_id,
    vendor_id: snap.vendor_id,
    assigned_technician_name: techName ?? undefined,
    assigned_crew_name: crewName ?? undefined,
    scheduled_date: scheduledDate,
    scheduled_start: snap.scheduled_start,
    scheduled_end: snap.scheduled_end,
    status: snap.status ?? base.status,
    updated_at: snap.updated_at ?? base.updated_at,
    assignment_type,
  };
}

const PENDING_ASSIGNMENTS_KEY = "cornerstone_dispatch_pending_assignments_v1";
const PENDING_ASSIGNMENT_TTL_MS = 10 * 60 * 1000;
const TRACE_WORK_ORDER_SESSION_KEY = "cornerstone_dispatch_trace_wo_id";

type PendingAssignmentMap = Record<string, WorkOrderAssignmentSnapshot & { savedAtMs: number }>;

function readPendingAssignments(): PendingAssignmentMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(PENDING_ASSIGNMENTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PendingAssignmentMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePendingAssignments(map: PendingAssignmentMap): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(map).length === 0) {
      window.sessionStorage.removeItem(PENDING_ASSIGNMENTS_KEY);
      return;
    }
    window.sessionStorage.setItem(PENDING_ASSIGNMENTS_KEY, JSON.stringify(map));
  } catch {
    // Best-effort cache only.
  }
}

function rowMatchesAssignmentSnapshot(row: DispatchWorkOrder, snap: WorkOrderAssignmentSnapshot): boolean {
  return (
    (row.assigned_technician_id ?? null) === (snap.assigned_technician_id ?? null) &&
    (row.assigned_crew_id ?? null) === (snap.assigned_crew_id ?? null) &&
    (row.vendor_id ?? null) === (snap.vendor_id ?? null) &&
    (toDateOnlyString(row.scheduled_date) ?? null) === (toDateOnlyString(snap.scheduled_date) ?? null) &&
    (row.scheduled_start ?? null) === (snap.scheduled_start ?? null) &&
    (row.scheduled_end ?? null) === (snap.scheduled_end ?? null)
  );
}

function reconcilePendingAssignments(
  workOrders: DispatchWorkOrder[],
  technicians: { id: string; name?: string | null }[],
  crews: { id: string; name?: string | null }[]
): DispatchWorkOrder[] {
  const map = readPendingAssignments();
  const now = Date.now();
  const nextMap: PendingAssignmentMap = {};
  let touched = false;

  const next = workOrders.map((row) => {
    const pending = map[row.id];
    if (!pending) return row;
    if (now - pending.savedAtMs > PENDING_ASSIGNMENT_TTL_MS) {
      touched = true;
      return row;
    }
    if (rowMatchesAssignmentSnapshot(row, pending)) {
      nextMap[row.id] = pending;
      return row;
    }
    touched = true;
    nextMap[row.id] = pending;
    return applyAssignmentSnapshotToRow(row, pending, technicians, crews);
  });

  // Keep non-expired pending assignments for ids not present in this payload yet.
  for (const [id, pending] of Object.entries(map)) {
    if (nextMap[id]) continue;
    if (now - pending.savedAtMs <= PENDING_ASSIGNMENT_TTL_MS) {
      nextMap[id] = pending;
    } else {
      touched = true;
    }
  }

  if (touched) writePendingAssignments(nextMap);
  return next;
}

function readTraceWorkOrderIdFromBrowser(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.sessionStorage.getItem(TRACE_WORK_ORDER_SESSION_KEY);
    return id && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Toolbar + URL filters (assignment, status, priority, category) are applied client-side so the board
 * always receives full WO rows after refresh; DB filters on status would drop jobs that transition
 * (e.g. ready_to_schedule → scheduled) after a drop.
 */
function filterWorkOrdersByToolbarFilters(
  workOrders: DispatchWorkOrder[],
  filterState: DispatchFilterState
): DispatchWorkOrder[] {
  const { technicianId, crewId, assignmentType, status, priority, category } = filterState;
  const hasAssignmentFilters = !!(technicianId || crewId || assignmentType);
  const hasMetaFilters = !!(status || priority || category);
  if (!hasAssignmentFilters && !hasMetaFilters) return workOrders;

  return workOrders.filter((wo) => {
    if (technicianId && wo.assigned_technician_id !== technicianId) return false;
    if (crewId && wo.assigned_crew_id !== crewId) return false;
    if (assignmentType === "unassigned") {
      if (wo.assigned_technician_id || wo.assigned_crew_id || wo.vendor_id) return false;
    } else if (assignmentType === "technician") {
      if (!wo.assigned_technician_id) return false;
    } else if (assignmentType === "crew") {
      if (!wo.assigned_crew_id) return false;
    } else if (assignmentType === "vendor") {
      if (!wo.vendor_id) return false;
    }

    if (status) {
      const woSt = normalizeWorkOrderStatus(wo.status ?? "");
      const want = normalizeWorkOrderStatus(status);
      if (woSt !== want) return false;
    }
    if (priority && (wo.priority ?? "").toLowerCase() !== priority.toLowerCase()) return false;
    if (category && (wo.category ?? "") !== category) return false;

    return true;
  });
}

type DispatchViewProps = {
  initialData: LoadDispatchResult;
  filterState: DispatchFilterState;
};

export function DispatchView({
  initialData,
  filterState,
}: DispatchViewProps) {
  const { isDemoGuest } = useGuidance();
  const { markAssignedTechnician } = useGetStartedOnboarding();
  const DEMO_DISPATCH_STATE_KEY = "cornerstone_demo_dispatch_runtime_v1";
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
  const [selectedMapTechnicianId, setSelectedMapTechnicianId] = useState<string | null>(
    filterState.technicianId || null
  );
  const [selectedMapWorkOrderId, setSelectedMapWorkOrderId] = useState<string | null>(null);
  const [hoveredWorkOrderId, setHoveredWorkOrderId] = useState<string | null>(null);
  const [drawerWorkOrderId, setDrawerWorkOrderId] = useState<string | null>(null);
  const [mapAssigning, setMapAssigning] = useState(false);
  const [dispatchBoardMode, setDispatchBoardMode] = useState<"technicians" | "crews">("technicians");
  const [hideFullyScheduledTechnicians, setHideFullyScheduledTechnicians] = useState(false);
  const [showOnlyAvailableTechnicians, setShowOnlyAvailableTechnicians] = useState(false);
  const [sortTechniciansByDistance, setSortTechniciansByDistance] = useState(false);
  const [technicianPage, setTechnicianPage] = useState(0);
  const TECHNICIAN_PAGE_SIZE = 8;
  /** Map+ split: on &lt;xl screens the map opens in a slide-over; desktop shows map column always. */
  const [mobileMapPanelOpen, setMobileMapPanelOpen] = useState(false);
  const [optimisticWorkOrders, setOptimisticWorkOrders] = useState<DispatchWorkOrder[]>(
    initialData.workOrders
  );

  /** Persist demo state before syncing from server/sessionStorage so the next effect reads fresh data. */
  useEffect(() => {
    if (!isDemoGuest || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        DEMO_DISPATCH_STATE_KEY,
        JSON.stringify(optimisticWorkOrders)
      );
    } catch {
      // Best-effort persistence only.
    }
  }, [isDemoGuest, optimisticWorkOrders]);

  useEffect(() => {
    if (isDemoGuest && typeof window !== "undefined") {
      const raw = window.sessionStorage.getItem(DEMO_DISPATCH_STATE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as DispatchWorkOrder[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOptimisticWorkOrders(
              reconcilePendingAssignments(
                parsed,
                initialData.workforce.technicians,
                initialData.crews
              )
            );
            return;
          }
        } catch {
          // Fall back to server state below.
        }
      }
    }
    setOptimisticWorkOrders((prev) => {
      const merged = mergeWorkOrdersFromServer(prev, initialData.workOrders);
      return reconcilePendingAssignments(
        merged,
        initialData.workforce.technicians,
        initialData.crews
      );
    });
  }, [initialData.workOrders, isDemoGuest, initialData.workforce.technicians, initialData.crews]);

  useEffect(() => {
    setSelectedMapTechnicianId(filterState.technicianId || null);
  }, [filterState.technicianId]);

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

  useEffect(() => {
    if (filterState.viewMode !== "combined" || !selectedMapWorkOrderId) return;
    const el = document.getElementById(`dispatch-queue-wo-${selectedMapWorkOrderId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [filterState.viewMode, selectedMapWorkOrderId]);

  useEffect(() => {
    if (filterState.viewMode !== "combined") setMobileMapPanelOpen(false);
  }, [filterState.viewMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const collisionDetectionStrategy = useCallback<
    NonNullable<React.ComponentProps<typeof DndContext>["collisionDetection"]>
  >((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      /** Prefer hour-slot droppables over any larger overlapping region. */
      const slotHits = pointerCollisions.filter((c) => String(c.id).startsWith("slot-"));
      if (slotHits.length > 0) return slotHits;
      return pointerCollisions;
    }
    return rectIntersection(args);
  }, []);

  const pushFilterState = useCallback(
    (nextState: DispatchFilterState) => {
      const next = filterStateToParams(nextState);
      const fullscreen = searchParams.get("dispatch_fullscreen");
      if (fullscreen === "1") next.set("dispatch_fullscreen", "1");
      const nextQuery = next.toString();
      if (nextQuery === searchParams.toString()) return;
      router.replace(`${pathname}?${nextQuery}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setFullScreen = useCallback(
    (enabled: boolean) => {
      const next = new URLSearchParams(searchParams.toString());
      if (enabled) next.set("dispatch_fullscreen", "1");
      else next.delete("dispatch_fullscreen");
      const nextQuery = next.toString();
      if (nextQuery === searchParams.toString()) return;
      router.replace(`${pathname}?${nextQuery}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const patchFilterState = useCallback(
    (patch: Partial<DispatchFilterState>) => {
      const next: DispatchFilterState = {
        ...filterState,
        ...patch,
      };
      if (
        patch.companyId !== undefined &&
        patch.companyId !== filterState.companyId
      ) {
        next.propertyId = "";
        next.buildingId = "";
      }
      if (
        patch.propertyId !== undefined &&
        patch.propertyId !== filterState.propertyId
      ) {
        next.buildingId = "";
      }
      pushFilterState(next);
    },
    [filterState, pushFilterState]
  );

  const workOrdersMatchingToolbarFilters = useMemo(
    () => filterWorkOrdersByToolbarFilters(optimisticWorkOrders, filterState),
    [
      optimisticWorkOrders,
      filterState.technicianId,
      filterState.crewId,
      filterState.assignmentType,
      filterState.status,
      filterState.priority,
      filterState.category,
    ]
  );

  /** Full list (ignore toolbar filters) so crew lanes / rebalance stay correct when filters narrow the queue. */
  const scheduledTodayUnfiltered = useMemo(() => {
    const today = filterState.selectedDate;
    const scheduledToday: DispatchWorkOrder[] = [];
    for (const wo of optimisticWorkOrders) {
      const scheduled = toDateOnlyString(wo.scheduled_date);
      const hasAssignment = Boolean(wo.assigned_crew_id || wo.assigned_technician_id);
      if (scheduled === today && hasAssignment) {
        scheduledToday.push(wo);
      }
    }
    return scheduledToday;
  }, [filterState.selectedDate, optimisticWorkOrders]);

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
    let dueToday = 0;
    let unassignedWorkOrders = 0;

    for (const wo of workOrdersMatchingToolbarFilters) {
      const scheduled = toDateOnlyString(wo.scheduled_date);
      const due = toDateOnlyString(wo.due_date);
      const comparableStatus = normalizeWorkOrderStatus(wo.status ?? "");
      const isTerminal = comparableStatus === "completed" || comparableStatus === "cancelled";
      const hasAssignment = Boolean(wo.assigned_crew_id || wo.assigned_technician_id);

      if (!hasAssignment && !isTerminal) unassignedWorkOrders += 1;
      if (!isTerminal && due === today) dueToday += 1;
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
        total: workOrdersMatchingToolbarFilters.length,
        dueToday,
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
  }, [filterState.selectedDate, workOrdersMatchingToolbarFilters]);

  const boardCrews = useMemo(() => {
    const scheduledByCrew = new Map<string, DispatchWorkOrder[]>();
    initialData.crews.forEach((crew) => scheduledByCrew.set(crew.id, []));
    scheduledTodayUnfiltered.forEach((wo) => {
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
  }, [scheduledTodayUnfiltered, initialData.crews]);

  const { lanes: boardLanes, workOrdersByLane: boardWorkOrdersByLane } = useMemo(() => {
    const selectedDate = filterState.selectedDate;
    const scheduledTodayForDate = optimisticWorkOrders.filter(
      (wo) => toDateOnlyString(wo.scheduled_date) === selectedDate
    );
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
        ...pageTechnicians.map((t) => {
          const techJobs = scheduledTodayForDate.filter((wo) => wo.assigned_technician_id === t.id);
          const sortedEnds = techJobs
            .map((wo) => wo.scheduled_end)
            .filter(Boolean) as string[];
          sortedEnds.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          const lastEnd = sortedEnds[0];
          const nextOpeningFormatted = lastEnd
            ? new Date(lastEnd).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
            : "8:00 AM";
          return {
            id: `tech-${t.id}`,
            name: t.name,
            total_scheduled_hours: Math.round((t.workloadHoursToday ?? 0) * 10) / 10,
            job_count: t.scheduledToday ?? 0,
            remainingHours: t.availableCapacityHours ?? Math.max(0, (t.dailyCapacityHours ?? 8) - (t.workloadHoursToday ?? 0)),
            capacityHours: t.dailyCapacityHours ?? 8,
            nextOpeningFormatted: techJobs.length > 0 ? nextOpeningFormatted : "8:00 AM",
          };
        }),
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
        const cap = workload?.dailyCapacityHours ?? 8;
        const remaining = workload?.availableCapacityHours ?? Math.max(0, cap - (crew.total_scheduled_hours ?? 0));
        return {
          id: crew.id,
          name: crew.name ?? undefined,
          total_scheduled_hours: crew.total_scheduled_hours ?? 0,
          job_count: crew.job_count ?? 0,
          remainingHours: remaining,
          capacityHours: cap,
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
    sortTechniciansByDistance,
    selectedMapWorkOrderId,
  ]);

  const { filteredLanes, filteredWorkOrdersByLane } = useMemo(() => {
    const unassignedId = "__unassigned__";
    const shouldFilter =
      dispatchBoardMode === "technicians" &&
      (hideFullyScheduledTechnicians || showOnlyAvailableTechnicians);
    if (!shouldFilter)
      return { filteredLanes: boardLanes, filteredWorkOrdersByLane: boardWorkOrdersByLane };
    const kept = boardLanes.filter(
      (l) =>
        l.id === unassignedId || (l.remainingHours ?? 0) > 0
    );
    const keptIds = new Set(kept.map((l) => l.id));
    const filteredMap = new Map<string, typeof optimisticWorkOrders>();
    keptIds.forEach((id) => {
      const list = boardWorkOrdersByLane.get(id);
      if (list) filteredMap.set(id, list);
    });
    return { filteredLanes: kept, filteredWorkOrdersByLane: filteredMap };
  }, [
    boardLanes,
    boardWorkOrdersByLane,
    dispatchBoardMode,
    hideFullyScheduledTechnicians,
    showOnlyAvailableTechnicians,
  ]);

  const hasNoResults =
    optimisticWorkOrders.length === 0 &&
    dispatchData.unscheduled.length === 0 &&
    dispatchData.overdue.length === 0 &&
    dispatchData.ready.length === 0 &&
    boardCrews.every((crew) => (crew.scheduled_today?.length ?? 0) === 0);

  useEffect(() => {
    const traceFromQuery = searchParams.get("trace_wo")?.trim() || null;
    const traceFromSession = readTraceWorkOrderIdFromBrowser();
    const tracedWorkOrderId = traceFromQuery ?? traceFromSession ?? null;
    if (!tracedWorkOrderId) return;
    const raw = optimisticWorkOrders.find((w) => w.id === tracedWorkOrderId) ?? null;
    const toolbarVisible = workOrdersMatchingToolbarFilters.some((w) => w.id === tracedWorkOrderId);
    const scheduledDate = toDateOnlyString(raw?.scheduled_date);
    const dateBucket =
      !raw ? "missing"
      : !scheduledDate ? "unscheduled"
      : scheduledDate === filterState.selectedDate
        ? "scheduled_for_selected_date"
        : `scheduled_for_other_date:${scheduledDate}`;
    let laneId: string | null = null;
    for (const [candidateLaneId, rows] of boardWorkOrdersByLane.entries()) {
      if (rows.some((w) => w.id === tracedWorkOrderId)) {
        laneId = candidateLaneId;
        break;
      }
    }
    const classification = !raw
      ? "missing"
      : scheduledDate === filterState.selectedDate && (raw.assigned_technician_id || raw.assigned_crew_id)
        ? "scheduled_on_board"
        : !scheduledDate
          ? "queue_unscheduled"
          : "not_on_selected_date";
    // eslint-disable-next-line no-console
    console.log("[dispatch-trace][step6][frontend-mapping]", {
      tracedWorkOrderId,
      selectedDate: filterState.selectedDate,
      raw,
      toolbarVisible,
      classification,
      dateBucket,
      laneId,
      excludedReasons: {
        missingFromOptimisticState: raw == null,
        filteredByToolbar: raw != null && !toolbarVisible,
        scheduledDateMismatch: raw != null && scheduledDate != null && scheduledDate !== filterState.selectedDate,
        missingAssignmentForBoard:
          raw != null &&
          scheduledDate === filterState.selectedDate &&
          !raw.assigned_technician_id &&
          !raw.assigned_crew_id,
      },
    });
  }, [
    boardWorkOrdersByLane,
    filterState.selectedDate,
    optimisticWorkOrders,
    searchParams,
    workOrdersMatchingToolbarFilters,
  ]);

  const selectedMapTechnician = useMemo(
    () =>
      initialData.workforce.technicians.find(
        (technician) => technician.id === selectedMapTechnicianId
      ) ?? null,
    [initialData.workforce.technicians, selectedMapTechnicianId]
  );

  const selectedRoute = useMemo(() => {
    if (!selectedMapTechnician) return null;
    return buildTechnicianRoute(
      selectedMapTechnician,
      optimisticWorkOrders,
      filterState.selectedDate
    );
  }, [filterState.selectedDate, optimisticWorkOrders, selectedMapTechnician]);

  const operationsListWorkOrders = useMemo(() => {
    const filtered = workOrdersMatchingToolbarFilters.filter((workOrder) => {
      const comparableStatus = normalizeWorkOrderStatus(workOrder.status ?? "");
      if (comparableStatus === "completed" || comparableStatus === "cancelled") return false;
      const sd = toDateOnlyString(workOrder.scheduled_date);
      return !sd || sd === filterState.selectedDate;
    });
    return [...filtered].sort((a, b) => {
      const aScheduled = toDateOnlyString(a.scheduled_date) === filterState.selectedDate ? 0 : 1;
      const bScheduled = toDateOnlyString(b.scheduled_date) === filterState.selectedDate ? 0 : 1;
      if (aScheduled !== bScheduled) return aScheduled - bScheduled;
      const startSort = (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? "");
      if (startSort !== 0) return startSort;
      const prioritySort = queuePriorityRank(a.priority) - queuePriorityRank(b.priority);
      if (prioritySort !== 0) return prioritySort;
      const dueSort = (a.due_date ?? "").localeCompare(b.due_date ?? "");
      if (dueSort !== 0) return dueSort;
      return (a.work_order_number ?? "").localeCompare(b.work_order_number ?? "");
    });
  }, [filterState.selectedDate, workOrdersMatchingToolbarFilters]);

  const operationsListTravelByWorkOrderId = useMemo((): Map<string, WorkOrderTravelInfo> | null => {
    const list = operationsListWorkOrders;
    const technicians = initialData.workforce.technicians.filter((t) => hasCoordinate(t.latitude, t.longitude));
    if (technicians.length === 0) return null;
    const map = new Map<string, WorkOrderTravelInfo>();
    list.forEach((wo) => {
      if (!hasCoordinate(wo.latitude, wo.longitude)) return;
      const point = { latitude: wo.latitude as number, longitude: wo.longitude as number };
      if (selectedMapTechnician && hasCoordinate(selectedMapTechnician.latitude, selectedMapTechnician.longitude)) {
        const ref = { latitude: selectedMapTechnician.latitude as number, longitude: selectedMapTechnician.longitude as number };
        const distanceMiles = haversineMiles(ref, point);
        map.set(wo.id, { distanceMiles, travelMinutes: estimateTravelMinutes(distanceMiles) });
      } else {
        let bestMiles = Infinity;
        technicians.forEach((t) => {
          const ref = { latitude: t.latitude as number, longitude: t.longitude as number };
          const d = haversineMiles(ref, point);
          if (d < bestMiles) bestMiles = d;
        });
        if (Number.isFinite(bestMiles))
          map.set(wo.id, { distanceMiles: bestMiles, travelMinutes: estimateTravelMinutes(bestMiles) });
      }
    });
    return map;
  }, [operationsListWorkOrders, selectedMapTechnician, initialData.workforce.technicians]);

  const drawerWorkOrder = useMemo(
    () => optimisticWorkOrders.find((workOrder) => workOrder.id === drawerWorkOrderId) ?? null,
    [drawerWorkOrderId, optimisticWorkOrders]
  );

  const openWorkOrderDrawer = useCallback((workOrderId: string) => {
    setSelectedMapWorkOrderId(workOrderId);
    setDrawerWorkOrderId(workOrderId);
  }, []);

  const scrollTimelineToWorkOrder = useCallback((workOrderId: string) => {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      const card = document.getElementById(`dispatch-board-card-${workOrderId}`);
      card?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }, 150);
  }, []);

  const rebalanceSuggestions = useMemo(() => {
    const scheduledCrewOnly = scheduledTodayUnfiltered.filter(
      (wo) => wo.assigned_crew_id != null
    );
    return computeRebalanceSuggestions({
      scheduledWorkOrders: scheduledCrewOnly,
      crewWorkloads: initialData.workforce.crews,
      selectedDate: filterState.selectedDate,
      maxSuggestions: 10,
    });
  }, [
    scheduledTodayUnfiltered,
    initialData.workforce.crews,
    filterState.selectedDate,
  ]);

  const applyOptimisticAssignment = useCallback(
    async (
      workOrder: DispatchWorkOrder,
      payload: {
        assigned_technician_id: string | null;
        assigned_crew_id: string | null;
        assigned_vendor_id?: string | null;
        scheduled_date: string | null;
        scheduled_start: string | null;
        scheduled_end: string | null;
        debug_trace_work_order_id?: string | null;
      },
      patch: Partial<DispatchWorkOrder>
    ) => {
      setDropError(null);
      const previous = optimisticWorkOrders;
      setOptimisticWorkOrders((current) => {
        const idx = current.findIndex((row) => row.id === workOrder.id);
        const merged = {
          ...workOrder,
          ...patch,
          updated_at: new Date().toISOString(),
        } as DispatchWorkOrder;
        if (merged.scheduled_date != null && merged.scheduled_date !== "") {
          merged.scheduled_date = toDateOnlyString(merged.scheduled_date as string) ?? merged.scheduled_date;
        }
        if (merged.due_date != null && merged.due_date !== "") {
          merged.due_date = toDateOnlyString(merged.due_date as string) ?? merged.due_date;
        }
        if (idx === -1) {
          return [...current, merged];
        }
        return current.map((row) => (row.id === workOrder.id ? merged : row));
      });

      if (isDemoGuest) {
        const snap = demoAssignmentSnapshotFromPayload(workOrder, payload, patch);
        const pending = readPendingAssignments();
        pending[snap.id] = { ...snap, savedAtMs: Date.now() };
        writePendingAssignments(pending);
        setOptimisticWorkOrders((current) => {
          const idx = current.findIndex((r) => r.id === snap.id);
          const base = idx >= 0 ? current[idx] : workOrder;
          const next = applyAssignmentSnapshotToRow(
            base,
            snap,
            initialData.workforce.technicians,
            initialData.crews
          );
          if (idx === -1) return [...current, next];
          return current.map((row) => (row.id === snap.id ? next : row));
        });
        if (
          payload.assigned_technician_id != null ||
          payload.assigned_crew_id != null ||
          payload.assigned_vendor_id != null
        ) {
          markAssignedTechnician();
        }
        queueMicrotask(() => {
          window.dispatchEvent(new CustomEvent("cornerstone:ops-optimization-refresh"));
        });
        return;
      }

      let result: Awaited<ReturnType<typeof updateWorkOrderAssignment>>;
      try {
        result = await updateWorkOrderAssignment(workOrder.id, payload);
      } catch (err) {
        setOptimisticWorkOrders(previous);
        const message =
          err instanceof Error ? err.message : "Failed to save assignment. Check your connection.";
        setDropError(message);
        // eslint-disable-next-line no-console
        console.error("[dispatch] updateWorkOrderAssignment threw", err);
        return;
      }
      if (result?.error) {
        setOptimisticWorkOrders(previous);
        setDropError(result.error);
        // eslint-disable-next-line no-console
        console.warn("[dispatch] assignment rejected by server", { workOrderId: workOrder.id, error: result.error });
        return;
      }

      if (result.success && result.assignmentSnapshot) {
        const snap = result.assignmentSnapshot;
        const pending = readPendingAssignments();
        pending[snap.id] = { ...snap, savedAtMs: Date.now() };
        writePendingAssignments(pending);
        setOptimisticWorkOrders((current) => {
          const idx = current.findIndex((r) => r.id === snap.id);
          const base = idx >= 0 ? current[idx] : workOrder;
          const next = applyAssignmentSnapshotToRow(
            base,
            snap,
            initialData.workforce.technicians,
            initialData.crews
          );
          if (idx === -1) return [...current, next];
          return current.map((row) => (row.id === snap.id ? next : row));
        });
      }
      if (
        result.success &&
        (payload.assigned_technician_id != null ||
          payload.assigned_crew_id != null ||
          payload.assigned_vendor_id != null)
      ) {
        markAssignedTechnician();
      }

      queueMicrotask(() => {
        router.refresh();
        window.dispatchEvent(new CustomEvent("cornerstone:ops-optimization-refresh"));
      });
    },
    [
      optimisticWorkOrders,
      router,
      initialData.workforce.technicians,
      initialData.crews,
      markAssignedTechnician,
      isDemoGuest,
    ]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    const workOrder =
      data?.type === "dispatch-work-order" && data.workOrder
        ? (data.workOrder as DispatchWorkOrder)
        : data?.type === "dispatch-work-order-board" && data.workOrder
          ? (data.workOrder as DispatchWorkOrder)
          : null;
    if (!workOrder) return;
    setActiveWo(workOrder);
    const traceFromQuery = searchParams.get("trace_wo")?.trim() || null;
    const traceFromSession = readTraceWorkOrderIdFromBrowser();
    const traceWorkOrderId = traceFromQuery ?? traceFromSession ?? workOrder.id;
    if (!traceFromQuery && typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(TRACE_WORK_ORDER_SESSION_KEY, traceWorkOrderId);
      } catch {
        // Best-effort only.
      }
      const next = new URLSearchParams(searchParams.toString());
      next.set("trace_wo", traceWorkOrderId);
      const nextQuery = next.toString();
      if (nextQuery !== searchParams.toString()) {
        router.replace(`${pathname}?${nextQuery}`, { scroll: false });
      }
    }
    if (traceWorkOrderId === workOrder.id) {
      // eslint-disable-next-line no-console
      console.log("[dispatch-trace][step2][pre-drop-state]", {
        id: workOrder.id,
        technician_id: workOrder.assigned_technician_id ?? null,
        scheduled_start: workOrder.scheduled_start ?? null,
        scheduled_end: workOrder.scheduled_end ?? null,
        status: workOrder.status ?? null,
        tenant_id: (workOrder as { tenant_id?: string | null }).tenant_id ?? null,
      });
    }
  }, [pathname, router, searchParams]);

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

      /** Slot ids carry lane + hour; always parse from id so we do not rely on droppable data being present. */
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
      const traceFromQuery = searchParams.get("trace_wo")?.trim() || null;
      const traceFromSession = readTraceWorkOrderIdFromBrowser();
      const tracedWorkOrderId = traceFromQuery ?? traceFromSession ?? null;

      const isQueueUnscheduleTarget =
        dropData?.target === "queue-unschedule" ||
        overId === "queue-drop-unschedule" ||
        overId.startsWith("queue-wo-");

      if (isQueueUnscheduleTarget) {
        const normalized = normalizeWorkOrderStatus(workOrder.status ?? "");
        const optimisticStatus =
          normalized === "completed" || normalized === "cancelled"
            ? workOrder.status ?? normalized
            : "ready_to_schedule";
        await applyOptimisticAssignment(
          workOrder,
          {
            assigned_technician_id: null,
            assigned_crew_id: null,
            assigned_vendor_id: null,
            scheduled_date: null,
            scheduled_start: null,
            scheduled_end: null,
          },
          {
            assigned_technician_id: null,
            assigned_crew_id: null,
            vendor_id: null,
            assigned_technician_name: null,
            assigned_crew_name: null,
            vendor_name: null,
            assignment_type: "unassigned",
            scheduled_date: null,
            scheduled_start: null,
            scheduled_end: null,
            status: optimisticStatus,
          }
        );
        return;
      }

      if (!crewId || !dropDate) {
        const msg =
          "Could not read that drop target. Drop onto a technician time cell (grid), not the header.";
        setDropError(msg);
        // eslint-disable-next-line no-console
        console.warn("[dispatch] drop ignored — missing crewId or dropDate", {
          overId,
          crewId,
          dropDate,
          dropData,
        });
        return;
      }

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
          assigned_vendor_id: null,
          scheduled_date: dropDate,
          scheduled_start: startISO,
          scheduled_end: endISO,
          debug_trace_work_order_id: tracedWorkOrderId,
        },
        {
          assigned_technician_id: assignedTechnicianId,
          assigned_crew_id: assignedCrewId,
          vendor_id: null,
          assigned_technician_name: techName ?? undefined,
          assigned_crew_name: crewName ?? undefined,
          vendor_name: null,
          assignment_type: assignedTechnicianId ? "technician" : assignedCrewId ? "crew" : "unassigned",
          scheduled_date: dropDate,
          scheduled_start: startISO,
          scheduled_end: endISO,
          status: "scheduled",
        }
      );
      if (tracedWorkOrderId && tracedWorkOrderId === workOrder.id) {
        // eslint-disable-next-line no-console
        console.log("[dispatch-trace][step3][drop-payload]", {
          id: workOrder.id,
          target_technician_id: assignedTechnicianId,
          target_crew_id: assignedCrewId,
          scheduled_date: dropDate,
          scheduled_start: startISO,
          scheduled_end: endISO,
          status_change_to: "scheduled",
          payload: {
            assigned_technician_id: assignedTechnicianId,
            assigned_crew_id: assignedCrewId,
            assigned_vendor_id: null,
            scheduled_date: dropDate,
            scheduled_start: startISO,
            scheduled_end: endISO,
            debug_trace_work_order_id: tracedWorkOrderId,
          },
        });
      }
    },
    [
      applyOptimisticAssignment,
      filterState.selectedDate,
      initialData.workforce.technicians,
      initialData.crews,
      searchParams,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setActiveWo(null);
    setOverDropId(null);
  }, []);

  const handleSelectDate = useCallback(
    (date: string) => {
      const next: DispatchFilterState = { ...filterState, selectedDate: date, viewMode: "day" };
      pushFilterState(next);
    },
    [filterState, pushFilterState]
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
          assigned_vendor_id: (match.vendor_id as string | null | undefined) ?? null,
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
        const normalized = normalizeWorkOrderStatus(workOrder.status ?? "");
        const optimisticStatus =
          normalized === "completed" || normalized === "cancelled"
            ? workOrder.status ?? normalized
            : "ready_to_schedule";
        await applyOptimisticAssignment(
          workOrder,
          {
            assigned_technician_id: null,
            assigned_crew_id: null,
            assigned_vendor_id: null,
            scheduled_date: null,
            scheduled_start: null,
            scheduled_end: null,
          },
          {
            assigned_technician_id: null,
            assigned_crew_id: null,
            vendor_id: null,
            assigned_technician_name: null,
            assigned_crew_name: null,
            vendor_name: null,
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
      vendors: filterOptions.vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        company_id: vendor.company_id,
        service_type: vendor.service_type ?? null,
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

  const handleAssignFromMap = useCallback(
    async (workOrderId: string, technicianId: string) => {
      const workOrder = optimisticWorkOrders.find((row) => row.id === workOrderId);
      if (!workOrder) return;
      const technician = initialData.workforce.technicians.find((row) => row.id === technicianId);
      if (!technician) return;

      const scheduledForTechnician = optimisticWorkOrders
        .filter(
          (row) =>
            row.assigned_technician_id === technicianId &&
            toDateOnlyString(row.scheduled_date) === filterState.selectedDate
        )
        .sort((a, b) => (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? ""));
      const latestEndHour = scheduledForTechnician.reduce((latest, row) => {
        if (!row.scheduled_end) return latest;
        const hour = new Date(row.scheduled_end).getHours();
        return Number.isFinite(hour) ? Math.max(latest, hour) : latest;
      }, 7);
      const startHour = Math.max(8, Math.min(17, latestEndHour + 1));
      const startISO = toSlotISO(filterState.selectedDate, startHour);
      const hours = workOrder.estimated_hours ?? 1;
      const endISO = addHours(startISO, hours);

      setMapAssigning(true);
      try {
        await applyOptimisticAssignment(
          workOrder,
          {
            assigned_technician_id: technicianId,
            assigned_crew_id: null,
          assigned_vendor_id: null,
            scheduled_date: filterState.selectedDate,
            scheduled_start: startISO,
            scheduled_end: endISO,
          },
          {
            assigned_technician_id: technicianId,
            assigned_crew_id: null,
          vendor_id: null,
            assigned_technician_name: technician.name,
            assigned_crew_name: null,
          vendor_name: null,
            assignment_type: "technician",
            scheduled_date: filterState.selectedDate,
            scheduled_start: startISO,
            scheduled_end: endISO,
            status: "scheduled",
          }
        );
        setSelectedMapTechnicianId(technicianId);
        setSelectedMapWorkOrderId(workOrderId);
      } finally {
        setMapAssigning(false);
      }
    },
    [
      applyOptimisticAssignment,
      filterState.selectedDate,
      initialData.workforce.technicians,
      optimisticWorkOrders,
    ]
  );

  const handleSelectFromOperationsList = useCallback(
    (workOrderId: string) => {
      setSelectedMapWorkOrderId(workOrderId);
      const workOrder = optimisticWorkOrders.find((row) => row.id === workOrderId);
      if (!workOrder) return;
      if (
        dispatchBoardMode === "technicians" &&
        workOrder.assigned_technician_id &&
        initialData.workforce.technicians.length > 0
      ) {
        const technicianIndex = initialData.workforce.technicians.findIndex(
          (technician) => technician.id === workOrder.assigned_technician_id
        );
        if (technicianIndex >= 0) {
          setTechnicianPage(Math.floor(technicianIndex / TECHNICIAN_PAGE_SIZE));
        }
      }
      scrollTimelineToWorkOrder(workOrderId);
    },
    [
      dispatchBoardMode,
      initialData.workforce.technicians,
      optimisticWorkOrders,
      scrollTimelineToWorkOrder,
    ]
  );

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
        assigned_vendor_id: null,
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

  const opsMode = isFullScreen && filterState.viewMode === "combined";
  const [helpOpen, setHelpOpen] = useState(false);
  const showCombinedSidePanel =
    filterState.viewMode === "combined" &&
    (mobileMapPanelOpen || selectedMapWorkOrderId != null);

  const renderBoardToolbar = ({
    showAvailabilityFilters,
    showMobileMapButton,
  }: {
    showAvailabilityFilters: boolean;
    /** Opens map slide-over on narrow screens (Map+ split mode). */
    showMobileMapButton?: boolean;
  }) => (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] bg-[var(--card)]/80 px-2 py-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-medium text-[var(--muted)]">Timeline:</span>
        <div className="flex rounded border border-[var(--card-border)] bg-[var(--background)] p-0.5">
          <button
            type="button"
            onClick={() => setDispatchBoardMode("technicians")}
            className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
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
            className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              dispatchBoardMode === "crews"
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Crews
          </button>
        </div>
        {filterState.viewMode === "day" &&
          dispatchBoardMode === "technicians" &&
          initialData.workforce.technicians.length > TECHNICIAN_PAGE_SIZE && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTechnicianPage((p) => Math.max(0, p - 1))}
                disabled={technicianPage === 0}
                className="rounded border border-[var(--card-border)] bg-[var(--card)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--foreground)] disabled:opacity-50"
                aria-label="Previous page"
              >
                ←
              </button>
              <span className="text-[10px] text-[var(--muted)]">
                {technicianPage * TECHNICIAN_PAGE_SIZE + 1}–
                {Math.min(
                  (technicianPage + 1) * TECHNICIAN_PAGE_SIZE,
                  initialData.workforce.technicians.length
                )}{" "}
                of {initialData.workforce.technicians.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setTechnicianPage((p) =>
                    Math.min(
                      p + 1,
                      Math.ceil(
                        initialData.workforce.technicians.length /
                          TECHNICIAN_PAGE_SIZE
                      ) - 1
                    )
                  )
                }
                disabled={
                  technicianPage >=
                  Math.ceil(
                    initialData.workforce.technicians.length /
                      TECHNICIAN_PAGE_SIZE
                  ) - 1
                }
                className="rounded border border-[var(--card-border)] bg-[var(--card)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--foreground)] disabled:opacity-50"
                aria-label="Next page"
              >
                →
              </button>
            </div>
          )}
        {showAvailabilityFilters && dispatchBoardMode === "technicians" && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <input
                type="checkbox"
                checked={hideFullyScheduledTechnicians}
                onChange={(e) => setHideFullyScheduledTechnicians(e.target.checked)}
                className="rounded border-[var(--card-border)]"
              />
              Hide fully scheduled
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <input
                type="checkbox"
                checked={showOnlyAvailableTechnicians}
                onChange={(e) => setShowOnlyAvailableTechnicians(e.target.checked)}
                className="rounded border-[var(--card-border)]"
              />
              Show only available
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <input
                type="checkbox"
                checked={sortTechniciansByDistance}
                onChange={(e) => setSortTechniciansByDistance(e.target.checked)}
                className="rounded border-[var(--card-border)]"
              />
              Sort by distance
            </label>
          </div>
        )}
      </div>
      {showMobileMapButton ? (
        <div className="flex items-center gap-1 xl:hidden">
          <Button
            variant={mobileMapPanelOpen ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => setMobileMapPanelOpen((open) => !open)}
          >
            {mobileMapPanelOpen ? "Close map" : "Map"}
          </Button>
          {selectedMapWorkOrderId ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => setSelectedMapWorkOrderId(null)}
            >
              Hide details
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className={`flex min-w-0 min-h-0 flex-1 flex-col ${opsMode ? "gap-0" : isFullScreen ? "gap-1" : "gap-2"}`}
      data-get-started="assign"
    >
      {opsMode ? (
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Dispatch · Ops
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={() => setFullScreen(false)}
            >
              Exit Full Screen
            </Button>
          </div>
        </header>
      ) : (
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
          <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            Dispatch
          </h1>
          <div className="flex items-center gap-1.5">
            {!isFullScreen ? (
              <>
                <Link href="/work-orders">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    Work Orders
                  </Button>
                </Link>
                <Link href="/technicians/work-queue">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    Technician Queue
                  </Button>
                </Link>
              </>
            ) : null}
            <Button
              variant={isFullScreen ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFullScreen(!isFullScreen)}
            >
              {isFullScreen ? "Exit Full Screen" : "⛶ Full Screen"}
            </Button>
            <HelpTriggerButton onClick={() => setHelpOpen(true)} />
          </div>
        </header>
      )}

      {!opsMode && rebalanceSuggestions.length > 0 && (
        <Hint
          id="dispatch-rebalance"
          variant="banner"
          title="Workload rebalance suggested"
          message="Technician workload is uneven. Open the side panel and use Rebalance to spread jobs across crews."
          className="shrink-0"
        />
      )}

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-[var(--card-border)] bg-white/88 shadow-[var(--shadow-soft)] ${
          opsMode ? "rounded-lg" : "rounded-xl"
        }`}
      >
        <DispatchTopBar
          filterState={filterState}
          filterOptions={filterOptions}
          insights={dispatchData.insights}
          opsMode={opsMode}
        />

        {error && (
          <div className="shrink-0 border-b border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
            {error}
          </div>
        )}
        {dropError && (
          <div className="shrink-0 border-b border-red-500/50 bg-red-500/10 px-2 py-1 text-xs text-red-700 dark:text-red-300">
            {dropError}
          </div>
        )}

        {hasNoResults && (
          <div className="shrink-0 border-b border-[var(--card-border)] bg-[var(--background)]/50 px-2 py-3 text-center">
            <p className="text-xs font-medium text-[var(--foreground)]">
              No work orders match current filters
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              Change filters or date to see work orders.
            </p>
          </div>
        )}

        <div className="flex min-h-0 flex-1 min-w-0">
          {filterState.viewMode === "map" ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2">
              <DispatchMapPanel
                viewMode={filterState.viewMode}
                mapPanelVisible={true}
                workOrders={optimisticWorkOrders}
                workforce={workforce}
                filterState={filterState}
                filterOptions={filterOptions}
                selectedTechnicianId={selectedMapTechnicianId}
                selectedWorkOrderId={selectedMapWorkOrderId}
                hoveredWorkOrderId={hoveredWorkOrderId}
                assignmentPending={mapAssigning}
                onSelectTechnician={setSelectedMapTechnicianId}
                onSelectWorkOrder={setSelectedMapWorkOrderId}
                onHoverWorkOrder={setHoveredWorkOrderId}
                onOpenWorkOrderDrawer={openWorkOrderDrawer}
                onOpenWorkOrder={(id) => void handleOpenWorkOrder(id, "open")}
                onAssignFromMap={handleAssignFromMap}
                onPatchFilters={patchFilterState}
              />
            </div>
          ) : filterState.viewMode === "combined" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="flex min-h-0 min-w-0 flex-1">
                <DispatchSidebarQueue
                  unscheduled={dispatchData.unscheduled}
                  overdue={dispatchData.overdue}
                  ready={dispatchData.ready}
                  collapsed={queueCollapsed}
                  overDropId={overDropId}
                  isDraggingWorkOrder={Boolean(activeWo)}
                  onToggleCollapse={() => setQueueCollapsed((current) => !current)}
                  onOpenWorkOrder={(id, action) => {
                    setSelectedMapWorkOrderId(id);
                    handleOpenWorkOrder(id, action);
                  }}
                  selectedWorkOrderId={selectedMapWorkOrderId}
                />
                <main
                  className={`flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--background)] ${
                    queueCollapsed ? "" : "border-l border-[var(--card-border)]"
                  }`}
                >
                  <div className="flex h-full min-h-0 flex-col">
                    {renderBoardToolbar({
                      showAvailabilityFilters: true,
                      showMobileMapButton: true,
                    })}
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
                      <section className="min-h-0 min-w-0 flex-1 overflow-hidden">
                        {dispatchBoardMode === "technicians" &&
                        initialData.workforce.technicians.length === 0 ? (
                          <div className="flex h-full items-center justify-center border-b border-[var(--card-border)] bg-[var(--card)]/30 px-4 py-8">
                            <p className="text-sm font-medium text-[var(--muted)]">
                              No technicians available. Add technicians to begin scheduling.
                            </p>
                          </div>
                        ) : (
                          <div className="h-full min-h-0">
                            <DispatchBoard
                              lanes={filteredLanes}
                              workOrdersByLane={filteredWorkOrdersByLane}
                              selectedDate={filterState.selectedDate}
                              overDropId={overDropId}
                              isDraggingWorkOrder={Boolean(activeWo)}
                              view="day"
                              workOrders={optimisticWorkOrders}
                              routeTravelByWorkOrderId={selectedRoute?.travelByWorkOrderId}
                              selectedWorkOrderId={selectedMapWorkOrderId}
                              hoveredWorkOrderId={hoveredWorkOrderId}
                              onHoverWorkOrder={setHoveredWorkOrderId}
                              selectedTechnicianId={selectedMapTechnicianId}
                              onSelectDate={handleSelectDate}
                              onResizeEnd={handleResizeEnd}
                              onOpenWorkOrder={handleOpenWorkOrder}
                            />
                          </div>
                        )}
                      </section>
                      <aside className="relative hidden min-h-0 w-[min(38%,420px)] min-w-[280px] max-w-[40%] shrink-0 flex-col border-l border-[var(--card-border)] bg-[var(--card)]/70 xl:flex">
                        {selectedMapWorkOrderId ? (
                          <div className="absolute inset-0 z-30 flex flex-col overflow-hidden border-l border-[var(--card-border)] bg-[var(--card)] shadow-xl">
                            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--card-border)] px-2 py-1.5">
                              <p className="text-xs font-semibold text-[var(--foreground)]">Job details</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 shrink-0 px-2 text-[11px]"
                                onClick={() => setSelectedMapWorkOrderId(null)}
                              >
                                Close
                              </Button>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto">
                              <CombinedWorkOrderDetailsPanel
                                selectedWorkOrder={
                                  optimisticWorkOrders.find((w) => w.id === selectedMapWorkOrderId) ?? null
                                }
                                technicians={initialData.workforce.technicians}
                                workOrders={optimisticWorkOrders}
                                selectedDate={filterState.selectedDate}
                                onAssign={(workOrderId, technicianId) =>
                                  void handleAssignFromMap(workOrderId, technicianId)
                                }
                                assigning={mapAssigning}
                                onOpenWorkOrder={(id) => void handleOpenWorkOrder(id, "open")}
                              />
                            </div>
                          </div>
                        ) : null}
                        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-2">
                          <DispatchMapPanel
                            viewMode="combined"
                            mapPanelVisible={true}
                            workOrders={optimisticWorkOrders}
                            workforce={workforce}
                            filterState={filterState}
                            filterOptions={filterOptions}
                            selectedTechnicianId={selectedMapTechnicianId}
                            selectedWorkOrderId={selectedMapWorkOrderId}
                            hoveredWorkOrderId={hoveredWorkOrderId}
                            assignmentPending={mapAssigning}
                            onSelectTechnician={setSelectedMapTechnicianId}
                            onSelectWorkOrder={setSelectedMapWorkOrderId}
                            onHoverWorkOrder={setHoveredWorkOrderId}
                            onOpenWorkOrderDrawer={openWorkOrderDrawer}
                            onOpenWorkOrder={(id) => void handleOpenWorkOrder(id, "open")}
                            onAssignFromMap={handleAssignFromMap}
                            onPatchFilters={patchFilterState}
                          />
                        </div>
                      </aside>
                    </div>
                  </div>
                </main>
                {showCombinedSidePanel ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40 bg-black/25 xl:hidden"
                      aria-label="Close dispatch side panel"
                      onClick={() => {
                        setMobileMapPanelOpen(false);
                        setSelectedMapWorkOrderId(null);
                      }}
                    />
                    <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(92vw,380px)] flex-col border-l border-[var(--card-border)] bg-[var(--card)] shadow-xl xl:hidden">
                      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-3 py-2">
                        <p className="text-xs font-semibold text-[var(--foreground)]">Map & routing</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => {
                            setMobileMapPanelOpen(false);
                            setSelectedMapWorkOrderId(null);
                          }}
                        >
                          Close
                        </Button>
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                        {selectedMapWorkOrderId ? (
                          <div className="shrink-0 border-b border-[var(--card-border)]">
                            <CombinedWorkOrderDetailsPanel
                              selectedWorkOrder={
                                optimisticWorkOrders.find((w) => w.id === selectedMapWorkOrderId) ?? null
                              }
                              technicians={initialData.workforce.technicians}
                              workOrders={optimisticWorkOrders}
                              selectedDate={filterState.selectedDate}
                              onAssign={(workOrderId, technicianId) =>
                                void handleAssignFromMap(workOrderId, technicianId)
                              }
                              assigning={mapAssigning}
                              onOpenWorkOrder={(id) => void handleOpenWorkOrder(id, "open")}
                            />
                          </div>
                        ) : null}
                        <div className="min-h-[min(50vh,360px)] flex-1 overflow-hidden p-2">
                          <DispatchMapPanel
                            viewMode="combined"
                            mapPanelVisible={true}
                            workOrders={optimisticWorkOrders}
                            workforce={workforce}
                            filterState={filterState}
                            filterOptions={filterOptions}
                            selectedTechnicianId={selectedMapTechnicianId}
                            selectedWorkOrderId={selectedMapWorkOrderId}
                            hoveredWorkOrderId={hoveredWorkOrderId}
                            assignmentPending={mapAssigning}
                            onSelectTechnician={setSelectedMapTechnicianId}
                            onSelectWorkOrder={setSelectedMapWorkOrderId}
                            onHoverWorkOrder={setHoveredWorkOrderId}
                            onOpenWorkOrderDrawer={openWorkOrderDrawer}
                            onOpenWorkOrder={(id) => void handleOpenWorkOrder(id, "open")}
                            onAssignFromMap={handleAssignFromMap}
                            onPatchFilters={patchFilterState}
                          />
                        </div>
                      </div>
                    </aside>
                  </>
                ) : null}
              </div>
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
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
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
                  {["day", "week", "month"].includes(filterState.viewMode)
                    ? renderBoardToolbar({
                        showAvailabilityFilters: filterState.viewMode === "day",
                      })
                    : null}
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
                      <div className="h-full min-h-0">
                      <DispatchBoard
                        lanes={filteredLanes}
                        workOrdersByLane={filteredWorkOrdersByLane}
                        selectedDate={filterState.selectedDate}
                        overDropId={overDropId}
                        isDraggingWorkOrder={Boolean(activeWo)}
                        view={filterState.viewMode}
                        workOrders={optimisticWorkOrders}
                        routeTravelByWorkOrderId={selectedRoute?.travelByWorkOrderId}
                        selectedWorkOrderId={selectedMapWorkOrderId}
                        hoveredWorkOrderId={hoveredWorkOrderId}
                        onHoverWorkOrder={setHoveredWorkOrderId}
                        selectedTechnicianId={selectedMapTechnicianId}
                        onSelectDate={handleSelectDate}
                        onResizeEnd={handleResizeEnd}
                        onOpenWorkOrder={handleOpenWorkOrder}
                      />
                      </div>
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
          )}
        </div>
      </div>

      <DispatchWorkOrderDrawer
        workOrder={drawerWorkOrder}
        onClose={() => setDrawerWorkOrderId(null)}
        onOpenFullWorkOrder={(workOrderId) => {
          setDrawerWorkOrderId(null);
          void handleOpenWorkOrder(workOrderId, "open");
        }}
        onReassign={(workOrderId) => {
          const target = optimisticWorkOrders.find((workOrder) => workOrder.id === workOrderId) ?? null;
          setAssignmentTarget(target);
          setDrawerWorkOrderId(null);
        }}
      />

      <HelpDrawer
        title="How this screen works"
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <p className="mb-3 text-sm text-[var(--muted)]">
          The Dispatch screen is your scheduling board for work orders. Use it to match jobs to technicians or crews and
          plan the day.
        </p>
        <h3 className="mb-1 text-sm font-semibold">What this screen is for</h3>
        <p className="mb-3">
          This view shows unscheduled work in a queue and scheduled work on technician or crew lanes. You drag work
          orders onto lanes to assign and schedule them.
        </p>
        <h3 className="mb-1 text-sm font-semibold">Who typically uses it</h3>
        <ul className="mb-3 list-disc space-y-1 pl-5">
          <li>Dispatchers</li>
          <li>Maintenance supervisors</li>
          <li>Operations managers</li>
        </ul>
        <h3 className="mb-1 text-sm font-semibold">Key things you can do</h3>
        <ul className="mb-3 list-disc space-y-1 pl-5">
          <li>See unscheduled work orders in the queue.</li>
          <li>View technician or crew lanes with time slots.</li>
          <li>Drag a work order onto a lane to assign and schedule it.</li>
          <li>Open a work order drawer for quick details.</li>
        </ul>
        <h3 className="mb-1 text-sm font-semibold">Typical workflow</h3>
        <p className="mb-3">
          Work order created → appears in the Dispatch queue → dispatcher drags it onto a technician or crew lane →
          technician completes the work → status updates flow back into Work Orders.
        </p>
        <h3 className="mb-1 text-sm font-semibold">View modes</h3>
        <ul className="mb-3 list-disc space-y-1 pl-5">
          <li>
            <strong>Day</strong> — queue and schedule grid only (fastest). No map.
          </li>
          <li>
            <strong>Map</strong> — full-width map for routing; filters stay at the top.
          </li>
          <li>
            <strong>Map+</strong> — queue, board, and map side-by-side on large screens; on small screens use the{" "}
            <strong>Map</strong> button to open the map in a panel.
          </li>
        </ul>
        <h3 className="mb-1 text-sm font-semibold">Tips</h3>
        <ul className="mb-2 list-disc space-y-1 pl-5">
          <li>Watch lane load to avoid overbooking any one technician.</li>
          <li>Use filters and date controls to focus on a day or group of technicians.</li>
          <li>Drag cards to rebalance work quickly when priorities change.</li>
        </ul>
      </HelpDrawer>

      {assignmentTarget ? (
        <WorkOrderAssignmentModal
          key={assignmentTarget.id}
          open={Boolean(assignmentTarget)}
          onClose={() => setAssignmentTarget(null)}
          workOrderId={assignmentTarget.id}
          workOrderStatus={(assignmentTarget.status as string | undefined) ?? undefined}
          companyId={(assignmentTarget.company_id as string | null | undefined) ?? null}
          initial={{
            assigned_technician_id:
              (assignmentTarget.assigned_technician_id as string | null | undefined) ?? null,
            assigned_crew_id:
              (assignmentTarget.assigned_crew_id as string | null | undefined) ?? null,
            assigned_vendor_id:
              (assignmentTarget.vendor_id as string | null | undefined) ?? null,
            scheduled_date:
              (assignmentTarget.scheduled_date as string | null | undefined) ?? null,
            scheduled_start:
              (assignmentTarget.scheduled_start as string | null | undefined) ?? null,
            scheduled_end:
              (assignmentTarget.scheduled_end as string | null | undefined) ?? null,
          }}
          technicians={filterOptions.technicians}
          crews={boardCrews.map((crew) => ({
            id: crew.id,
            name: crew.name ?? "Unnamed crew",
            company_id: crew.company_id ?? null,
          }))}
          vendors={filterOptions.vendors}
          onSuccess={() => router.refresh()}
        />
      ) : null}

      {createWorkOrderModalOpen ? (
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
          vendors={createFormOptions.vendors}
          saveAction={saveWorkOrder}
        />
      ) : null}

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
