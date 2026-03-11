"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";
import { useTransition, useState, useEffect, useRef } from "react";
import { deleteWorkOrder, saveWorkOrder, updateWorkOrderStatus, bulkUpdateWorkOrderStatus, bulkDeleteWorkOrders, exportWorkOrdersCsv } from "../actions";
import type { WorkOrder, WorkOrderPrefill } from "./work-order-form-modal";
import { WorkOrderFormModal } from "./work-order-form-modal";
import { WorkOrderAssignmentModal } from "./work-order-assignment-modal";
import { WorkOrderKpiBar, type WorkOrderKpiStats } from "./work-order-kpi-bar";
import { WorkOrderSavedViews } from "./work-order-saved-views";
import { WorkOrderStatusBadge } from "./work-order-status-badge";
import { WorkOrderPriorityBadge } from "./work-order-priority-badge";
import { WorkOrderFilters } from "./work-order-filters";
import { WorkOrderDetailDrawer } from "./work-order-detail-drawer";

type CompanyOption = { id: string; name: string };
type PropertyOption = { id: string; name: string; company_id: string };
type BuildingOption = { id: string; name: string; property_id: string };
type UnitOption = { id: string; name: string; building_id: string };
type AssetOption = {
  id: string;
  name: string;
  company_id: string;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
};
type TechnicianOption = { id: string; name: string };

export type WorkOrderListStats = WorkOrderKpiStats & {
  new: number;
  readyToSchedule: number;
  scheduled: number;
  completedThisWeek: number;
};

type WorkOrderListRow = WorkOrder & {
  technician_name?: string;
  crew_name?: string;
  company_name?: string;
  customer_name?: string;
  location?: string;
  asset_name?: string;
};

const STATUS_OPTIONS_QUICK = [
  "new",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "on_hold",
  "cancelled",
] as const;

type CustomerOption = { id: string; name: string; company_id: string };
type CrewOption = { id: string; name: string; company_id: string | null };

type WorkOrdersListProps = {
  workOrders: WorkOrderListRow[];
  stats: WorkOrderListStats;
  companies: CompanyOption[];
  customers: CustomerOption[];
  properties: PropertyOption[];
  buildings: BuildingOption[];
  units: UnitOption[];
  assets: AssetOption[];
  technicians: TechnicianOption[];
  crews: CrewOption[];
  initialPrefill?: WorkOrderPrefill | null;
  autoOpenNew?: boolean;
  initialEditId?: string | null;
  error?: string | null;
};

function assignedDisplay(wo: WorkOrderListRow): string {
  const tech = wo.technician_name;
  const crew = wo.crew_name;
  if (tech && crew) return `${tech} / ${crew}`;
  if (tech) return tech;
  if (crew) return crew;
  return "—";
}

function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    const d = new Date(val);
    return d.toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

export function WorkOrdersList({
  workOrders: initialList,
  stats,
  companies,
  customers,
  properties,
  buildings,
  units,
  assets,
  technicians,
  crews,
  initialPrefill = null,
  autoOpenNew = false,
  initialEditId = null,
  error: initialError,
}: WorkOrdersListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [prefill, setPrefill] = useState<WorkOrderPrefill | null>(initialPrefill);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [assigningWorkOrder, setAssigningWorkOrder] = useState<WorkOrderListRow | null>(null);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailDrawerRow, setDetailDrawerRow] = useState<WorkOrderListRow | null>(null);
  const [bulkStatusDropdown, setBulkStatusDropdown] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const hasAutoOpened = useRef(false);
  const hasEditOpened = useRef(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === initialList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(initialList.map((wo) => wo.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  useEffect(() => {
    setPrefill(initialPrefill);
  }, [initialPrefill]);

  useEffect(() => {
    if (!autoOpenNew || hasAutoOpened.current || !initialPrefill) return;
    hasAutoOpened.current = true;
    setEditingWorkOrder(null);
    setPrefill(initialPrefill);
    setModalOpen(true);
    if (typeof window !== "undefined" && window.history.replaceState) {
      window.history.replaceState({}, "", pathname ?? "/work-orders");
    }
  }, [autoOpenNew, initialPrefill, pathname]);

  useEffect(() => {
    if (!initialEditId || hasEditOpened.current) return;
    const wo = initialList.find((w) => w.id === initialEditId);
    if (wo) {
      hasEditOpened.current = true;
      setEditingWorkOrder(wo as WorkOrder);
      setModalOpen(true);
      if (typeof window !== "undefined" && window.history.replaceState) {
        window.history.replaceState({}, "", pathname ?? "/work-orders");
      }
    }
  }, [initialEditId, initialList, pathname]);

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete work order "${title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteWorkOrder(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Work order deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingWorkOrder(null);
    setPrefill(null);
    setModalOpen(true);
  };
  const openEdit = (wo: WorkOrder) => {
    setEditingWorkOrder(wo);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingWorkOrder(null);
    router.refresh();
  };
  const setStatusForRow = (wo: WorkOrderListRow, newStatus: string) => {
    setStatusDropdownId(null);
    startTransition(async () => {
      const result = await updateWorkOrderStatus(wo.id, newStatus);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Status updated." });
        router.refresh();
      }
    });
  };

  const handleBulkStatus = (newStatus: string) => {
    setBulkStatusDropdown(false);
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const result = await bulkUpdateWorkOrderStatus(ids, newStatus);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: `Status updated for ${ids.length} work order(s).` });
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} work order(s)? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await bulkDeleteWorkOrders(ids);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: `Deleted ${ids.length} work order(s).` });
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  };

  const handleExport = async (ids: string[]) => {
    const result = await exportWorkOrdersCsv(ids);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    const blob = new Blob([result.data!], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "success", text: "Export downloaded." });
  };

  if (initialError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{initialError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-[var(--accent)]/10 text-[var(--accent)]"
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-[var(--foreground)]">Work Orders</h2>
          <p className="text-sm text-[var(--muted)]">Create and track maintenance and service jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickActionsOpen((v) => !v)}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
              title="Quick actions"
            >
              Quick actions ▾
            </button>
            {quickActionsOpen && (
              <>
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { openNew(); setQuickActionsOpen(false); }}
                    className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
                  >
                    Create work order
                  </button>
                  {selectedIds.size > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => { handleBulkStatus("in_progress"); setQuickActionsOpen(false); }}
                        disabled={isPending}
                        className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
                      >
                        Mark selected in progress
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport(Array.from(selectedIds))}
                        className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
                      >
                        Export selected
                      </button>
                    </>
                  )}
                  <a
                    href="/dispatch"
                    className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
                    onClick={() => setQuickActionsOpen(false)}
                  >
                    Open dispatch board
                  </a>
                </div>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setQuickActionsOpen(false)} />
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleExport(initialList.map((w) => w.id))}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            title="Export visible work orders to CSV"
          >
            Export
          </button>
          <button
            type="button"
            onClick={openNew}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            New Work Order
          </button>
        </div>
      </div>

      <WorkOrderKpiBar
        stats={{
          open: stats.open,
          inProgress: stats.inProgress,
          onHold: stats.onHold,
          overdue: stats.overdue,
          dueToday: stats.dueToday,
          completedToday: stats.completedToday,
        }}
      />
      <Suspense fallback={null}>
        <WorkOrderSavedViews />
      </Suspense>
      <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-[var(--card-border)]/50" />}>
        <WorkOrderFilters
          options={{
            companies,
            properties,
            buildings,
            units,
            assets,
            technicians,
            crews,
          }}
        />
      </Suspense>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {selectedIds.size} selected
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setBulkStatusDropdown((v) => !v)}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              Change status
            </button>
            {bulkStatusDropdown && (
              <>
                <div className="absolute left-0 top-full z-10 mt-1 min-w-[160px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg">
                  {STATUS_OPTIONS_QUICK.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleBulkStatus(s)}
                      disabled={isPending}
                      className="block w-full px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
                    >
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
                <div className="fixed inset-0 z-0" aria-hidden onClick={() => setBulkStatusDropdown(false)} />
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleExport(Array.from(selectedIds))}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
          >
            Export selected
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Delete selected
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
          >
            Clear selection
          </button>
        </div>
      )}

      {initialList.length === 0 ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">No work orders yet.</p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Create your first work order
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/70 text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="w-10 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={initialList.length > 0 && selectedIds.size === initialList.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                      className="rounded border-[var(--card-border)]"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Work Order #</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Property / Location</th>
                  <th className="px-4 py-3 font-semibold">Asset</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Scheduled</th>
                  <th className="px-4 py-3 font-semibold">Assigned To</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="w-28 px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialList.map((wo) => (
                  <tr
                    key={wo.id}
                    className={`border-b border-[var(--card-border)] last:border-0 transition-colors hover:bg-[var(--background)]/50 cursor-pointer ${
                      wo.status === "completed"
                        ? "bg-[var(--muted)]/5"
                        : ""
                    } ${
                      wo.priority === "emergency"
                        ? "border-l-4 border-l-red-500 bg-red-500/5 dark:border-l-red-400 dark:bg-red-500/10"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/work-orders/${wo.id}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {wo.work_order_number ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--foreground)]">
                      <Link href={`/work-orders/${wo.id}`} className="hover:underline">
                        {wo.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{wo.company_name ?? "—"}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{wo.customer_name ?? "—"}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)] max-w-[140px] truncate" title={wo.location ?? undefined}>{wo.location ?? "—"}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{wo.asset_name ?? "—"}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">
                      {(wo.source_type as string | undefined) === "preventive_maintenance" ? (
                        (wo.preventive_maintenance_plan_id as string | undefined) ? (
                          <Link
                            href={`/preventive-maintenance/${wo.preventive_maintenance_plan_id as string}`}
                            className="text-[var(--accent)] hover:underline"
                          >
                            PM
                          </Link>
                        ) : (
                          "PM"
                        )
                      ) : (
                        "Manual"
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <WorkOrderPriorityBadge priority={wo.priority ?? "medium"} />
                    </td>
                    <td className="px-4 py-3.5">
                      <WorkOrderStatusBadge status={wo.status ?? "new"} />
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{formatDate(wo.scheduled_date as string | null)}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{assignedDisplay(wo)}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{formatDate(wo.updated_at as string | null)}</td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          href={`/work-orders/${wo.id}`}
                          className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          View
                        </Link>
                        <span className="text-[var(--muted)]">|</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setAssigningWorkOrder(wo); }}
                          className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          Assign
                        </button>
                        <span className="text-[var(--muted)]">|</span>
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setStatusDropdownId((id) => (id === wo.id ? null : wo.id)); }}
                            className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          >
                            Change status
                          </button>
                          {statusDropdownId === wo.id && (
                            <>
                              <div className="absolute left-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg">
                                {STATUS_OPTIONS_QUICK.map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStatusForRow(wo, s)}
                                    disabled={isPending}
                                    className="block w-full px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
                                  >
                                    {s.replace(/_/g, " ")}
                                  </button>
                                ))}
                              </div>
                              <div
                                className="fixed inset-0 z-0"
                                aria-hidden
                                onClick={() => setStatusDropdownId(null)}
                              />
                            </>
                          )}
                        </div>
                        <span className="text-[var(--muted)]">|</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); openEdit(wo); }}
                          className="rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); handleDelete(wo.id, wo.title); }}
                          disabled={isPending}
                          className="rounded text-red-500 hover:underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <WorkOrderFormModal
        open={modalOpen}
        onClose={closeModal}
        workOrder={editingWorkOrder}
        prefill={editingWorkOrder ? null : prefill}
        companies={companies}
        customers={customers}
        properties={properties}
        buildings={buildings}
        units={units}
        assets={assets}
        technicians={technicians}
        crews={crews}
        saveAction={saveWorkOrder}
      />

      <WorkOrderDetailDrawer
        workOrder={detailDrawerRow}
        onClose={() => setDetailDrawerRow(null)}
        onAssign={() => {
          if (detailDrawerRow) setAssigningWorkOrder(detailDrawerRow);
          setDetailDrawerRow(null);
        }}
        onEdit={() => {
          if (detailDrawerRow) {
            setEditingWorkOrder(detailDrawerRow as WorkOrder);
            setModalOpen(true);
          }
          setDetailDrawerRow(null);
        }}
      />

      {assigningWorkOrder && (
        <WorkOrderAssignmentModal
          open={!!assigningWorkOrder}
          onClose={() => setAssigningWorkOrder(null)}
          workOrderId={assigningWorkOrder.id}
          workOrderStatus={assigningWorkOrder.status}
          companyId={assigningWorkOrder.company_id ?? null}
          initial={{
            assigned_technician_id: assigningWorkOrder.assigned_technician_id ?? null,
            assigned_crew_id: assigningWorkOrder.assigned_crew_id ?? null,
            scheduled_date: assigningWorkOrder.scheduled_date ?? null,
            scheduled_start: assigningWorkOrder.scheduled_start ?? null,
            scheduled_end: assigningWorkOrder.scheduled_end ?? null,
          }}
          technicians={technicians}
          crews={crews}
          onSuccess={() => {
            setAssigningWorkOrder(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
