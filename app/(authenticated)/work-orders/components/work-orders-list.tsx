"use client";

import React, { Suspense, useTransition, useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { deleteWorkOrder, saveWorkOrder, updateWorkOrderStatus, bulkUpdateWorkOrderStatus, bulkDeleteWorkOrders, exportWorkOrdersCsv } from "../actions";
import type { WorkOrder, WorkOrderPrefill } from "./work-order-form-modal";
import { WorkOrderFormModal } from "./work-order-form-modal";
import { WorkOrderAssignmentModal } from "./work-order-assignment-modal";
import { WorkOrderKpiBar, type WorkOrderKpiStats } from "./work-order-kpi-bar";
import { WorkOrderSavedViews } from "./work-order-saved-views";
import { TodaysFocusPanel } from "./todays-focus-panel";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { PriorityBadge } from "@/src/components/ui/priority-badge";
import { WorkOrderFilters } from "./work-order-filters";
import { CommandCenterLayout } from "@/src/components/command-center";
import { WorkOrderCommandCenterPane } from "./work-order-command-center-pane";
import { WorkOrderSlaSettingsModal } from "./work-order-sla-settings-modal";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/src/components/ui/page-header";
import { ActionBar } from "@/src/components/ui/action-bar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/ui/tooltip";
import { Hint } from "@/src/components/ui/hint";
import { ActionsDropdown } from "@/src/components/ui/actions-dropdown";
import { HelpDrawer } from "@/src/components/ui/help-drawer";
import { HelpTriggerButton } from "@/src/components/ui/help-trigger-button";
import { Pagination } from "@/src/components/ui/pagination";
import { CornerstoneAiPanel } from "@/app/(authenticated)/components/cornerstone-ai-panel";
import { Sparkles } from "lucide-react";

import { formatDate } from "@/src/lib/date-utils";
import type {
  CompanyOption,
  PropertyOption,
  BuildingOption,
  UnitOption,
  AssetOption,
  TechnicianOption,
  VendorOption,
} from "@/src/types/common";

export type WorkOrderListStats = WorkOrderKpiStats & {
  new: number;
  readyToSchedule: number;
  scheduled: number;
  completedThisWeek: number;
};

type WorkOrderListRow = WorkOrder & {
  technician_name?: string;
  crew_name?: string;
  vendor_name?: string;
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
type SlaPolicyOption = {
  company_id: string;
  priority: string;
  response_target_minutes: number;
};

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
  vendors: VendorOption[];
  slaPolicies: SlaPolicyOption[];
  initialPrefill?: WorkOrderPrefill | null;
  autoOpenNew?: boolean;
  initialEditId?: string | null;
  page: number;
  pageSize: number;
  totalCount: number;
  error?: string | null;
};

function assignedDisplay(wo: WorkOrderListRow): string {
  const tech = wo.technician_name;
  const crew = wo.crew_name;
  const vendor = wo.vendor_name;
  if (tech && crew) return `${tech} / ${crew}`;
  if (tech && vendor) return `${tech} / ${vendor}`;
  if (crew && vendor) return `${crew} / ${vendor}`;
  if (tech) return tech;
  if (crew) return crew;
  if (vendor) return vendor;
  return "—";
}

type WorkOrderRowProps = {
  wo: WorkOrderListRow;
  selected: boolean;
  isActive: boolean;
  isPending: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (wo: WorkOrderListRow) => void;
  onChangeStatus: (wo: WorkOrderListRow, status: (typeof STATUS_OPTIONS_QUICK)[number]) => void;
  onAssign: (wo: WorkOrderListRow) => void;
};

const WorkOrderTableRow = React.memo(function WorkOrderTableRow({
  wo,
  selected,
  isActive,
  isPending,
  onToggleSelect,
  onOpenDetail,
  onChangeStatus,
  onAssign,
}: WorkOrderRowProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleRowClick = () => onOpenDetail(wo);
  const isOverdue = (() => {
    const dueDate = (wo as Record<string, unknown>).due_date as string | null | undefined;
    return dueDate && dueDate < today && wo.status !== "completed" && wo.status !== "cancelled";
  })();
  const unassigned = !wo.assigned_technician_id && !wo.assigned_crew_id && !wo.vendor_id;
  const isUrgent = wo.priority === "emergency" || wo.priority === "urgent";
  const isHigh = wo.priority === "high" && !isUrgent;
  const secondaryParts = [wo.company_name, wo.location, wo.asset_name].filter(Boolean);
  const secondaryLine = secondaryParts.length > 0 ? secondaryParts.join(" · ") : "—";

  return (
    <tr
      key={wo.id}
      onClick={handleRowClick}
      className={`group border-b border-[var(--card-border)]/80 last:border-0 cursor-pointer transition-[background-color,border-color,box-shadow] duration-200 ease-out ${
        isActive
          ? "bg-[var(--accent)]/8 ring-inset ring-1 ring-[var(--accent)]/25"
          : "hover:bg-[var(--background)]/50 hover:shadow-[0_1px_0_0_rgba(0,0,0,0.03)]"
      } ${
        wo.status === "completed" ? "bg-[var(--muted)]/5 opacity-90" : ""
      } ${
        isOverdue
          ? "border-l-[3px] border-l-red-400/90 bg-red-50/50 dark:border-l-red-500/80 dark:bg-red-950/20"
          : isUrgent
            ? "border-l-[3px] border-l-red-400/80 bg-red-50/40 dark:border-l-red-500/70 dark:bg-red-950/15"
            : isHigh
              ? "border-l-[3px] border-l-amber-400/80 bg-amber-50/40 dark:border-l-amber-500/60 dark:bg-amber-950/20"
              : "border-l-[3px] border-l-transparent"
      }`}
    >
      <td className="w-10 px-3 py-4 align-top" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(wo.id)}
          aria-label={`Select ${wo.title ?? wo.id}`}
          className="rounded border-[var(--card-border)]"
        />
      </td>
      <td className="min-w-0 max-w-[320px] px-4 py-4 align-top">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/work-orders/${wo.id}`}
              className="shrink-0 text-[13px] font-medium text-[var(--accent)] transition-colors hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {wo.work_order_number ?? "—"}
            </Link>
            <span className="min-w-0 truncate text-[13px] font-medium text-[var(--foreground)]">
              {wo.title}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] leading-snug" title={secondaryLine}>
            {secondaryLine}
          </p>
        </div>
      </td>
      <td className="px-3 py-4 align-top">
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={wo.priority ?? "medium"} />
          <StatusBadge status={wo.status ?? "new"} />
          {isOverdue && (
            <span className="ui-badge border-red-200 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700">
              Overdue
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-4 align-top text-xs text-[var(--muted)]">
        <span className="block">{formatDate(wo.scheduled_date as string | null)}</span>
        {wo.due_date ? (
          <span className="block">Due {formatDate(wo.due_date as string)}</span>
        ) : null}
      </td>
      <td className="px-3 py-4 align-top">
        {unassigned ? (
          <span className="ui-badge inline-flex items-center gap-1.5 border-amber-200 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700">
            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
            Unassigned
          </span>
        ) : (
          <span className="text-xs text-[var(--muted)]">{assignedDisplay(wo)}</span>
        )}
      </td>
      <td className="w-24 px-3 py-4 align-top" onClick={(e) => e.stopPropagation()}>
        <ActionsDropdown
          align="right"
          items={[
            { type: "link", label: "View", href: `/work-orders/${wo.id}` },
            { type: "button", label: "Assign", onClick: () => onAssign(wo) },
            ...STATUS_OPTIONS_QUICK.map((s) => ({
              type: "button" as const,
              label: `Mark ${s.replace(/_/g, " ")}`,
              onClick: () => onChangeStatus(wo, s),
              disabled: isPending,
            })),
          ]}
        />
      </td>
    </tr>
  );
});

WorkOrderTableRow.displayName = "WorkOrderTableRow";

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
  vendors,
  slaPolicies,
  initialPrefill = null,
  autoOpenNew = false,
  initialEditId = null,
  page,
  pageSize,
  totalCount,
  error: initialError,
}: WorkOrdersListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [prefill, setPrefill] = useState<WorkOrderPrefill | null>(initialPrefill);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [assigningWorkOrder, setAssigningWorkOrder] = useState<WorkOrderListRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailDrawerRow, setDetailDrawerRow] = useState<WorkOrderListRow | null>(null);
  const [bulkStatusDropdown, setBulkStatusDropdown] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
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

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    const query = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    });
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
      <PageHeader
        icon={<ClipboardList className="size-5" />}
        title="Work Order Command Center"
        subtitle="Triage, dispatch, and manage work orders. Use filters and bulk actions for fast operations."
        actions={
          <div className="flex items-center gap-2">
          <Tooltip placement="bottom">
            <TooltipTrigger>
            <div className="relative">
            <button
              type="button"
              onClick={() => setQuickActionsOpen((v) => !v)}
              className="rounded-[var(--radius-control)] border border-[var(--card-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--background)]"
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
            </TooltipTrigger>
            <TooltipContent>Quick actions menu</TooltipContent>
          </Tooltip>
          <Tooltip placement="bottom">
            <TooltipTrigger>
              <button
                type="button"
                onClick={() => setAiPanelOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/80 px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
              >
                <Sparkles className="size-4" aria-hidden />
                Summarize queue
              </button>
            </TooltipTrigger>
            <TooltipContent>Get an AI summary of the current work order queue</TooltipContent>
          </Tooltip>
          <Tooltip placement="bottom">
            <TooltipTrigger>
              <HelpTriggerButton onClick={() => setHelpOpen(true)} />
            </TooltipTrigger>
            <TooltipContent>Open a simple guide for this screen</TooltipContent>
          </Tooltip>
          <Tooltip placement="bottom">
            <TooltipTrigger>
          <button
            type="button"
            onClick={() => setSlaModalOpen(true)}
            className="rounded-[var(--radius-control)] border border-[var(--card-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--background)]"
          >
            SLA Settings
          </button>
            </TooltipTrigger>
            <TooltipContent>Configure SLA targets</TooltipContent>
          </Tooltip>
          <Tooltip placement="bottom">
            <TooltipTrigger>
          <button
            type="button"
            onClick={() => handleExport(initialList.map((w) => w.id))}
            className="rounded-[var(--radius-control)] border border-[var(--card-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--background)]"
          >
            Export
          </button>
            </TooltipTrigger>
            <TooltipContent>Export to CSV</TooltipContent>
          </Tooltip>
          <Tooltip placement="bottom">
            <TooltipTrigger>
          <button
            type="button"
            onClick={openNew}
            data-get-started="create-work-order"
            className="rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-glow)] hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            New Work Order
          </button>
            </TooltipTrigger>
            <TooltipContent>Create work order</TooltipContent>
          </Tooltip>
          </div>
        }
      />

      {initialList.length > 0 && (
        <TodaysFocusPanel workOrders={initialList} />
      )}
      {initialList.length > 0 && stats.readyToSchedule + stats.new >= 5 && (
        <Hint
          id="work-orders-many-unassigned"
          variant="banner"
          message="You have several work orders not yet assigned. Open Dispatch to drag-and-drop jobs onto technicians or crews."
          action={
            <Link href="/dispatch" className="mt-1 inline-block text-sm font-medium text-[var(--accent)] hover:underline">
              Open Dispatch →
            </Link>
          }
        />
      )}
      <div data-tour="demo-guided:completion" data-get-started="complete">
        <div data-tour="work-orders:statuses">
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
        </div>
      </div>
      <Suspense fallback={null}>
        <WorkOrderSavedViews />
      </Suspense>
      <Suspense fallback={<div className="h-12 animate-pulse rounded-lg bg-[var(--card-border)]/50" />}>
        <div data-tour="work-orders:scheduling">
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
        </div>
      </Suspense>

      {selectedIds.size > 0 && (
        <ActionBar className="flex flex-wrap items-center gap-3 border-[var(--accent)]/30 bg-[var(--accent)]/5">
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
        </ActionBar>
      )}

      {initialList.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--card-border)] bg-[var(--card)] py-16 text-center shadow-[var(--shadow-soft)]">
          <ClipboardList className="mx-auto mb-3 size-9 text-[var(--muted)]/40" strokeWidth={1.5} />
          <p className="text-sm font-medium text-[var(--foreground)]">No work orders found</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Try adjusting your filters, or create a new work order to get started.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/work-orders")}
              className="rounded-[var(--radius-control)] border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={openNew}
              className="rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-glow)] hover:bg-[var(--accent-hover)]"
            >
              New Work Order
            </button>
          </div>
        </div>
      ) : (
        <CommandCenterLayout
          listContent={
            <div data-tour="demo-guided:execution">
              <div
                className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--card-border)]/80 bg-[var(--card)] shadow-sm"
                data-tour="work-orders:assignment"
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--card-border)]/80 bg-[var(--background)]/50 text-xs uppercase tracking-wider text-[var(--muted)]">
                        <th className="w-10 px-3 py-3.5 font-medium">
                          <input
                            type="checkbox"
                            checked={initialList.length > 0 && selectedIds.size === initialList.length}
                            onChange={toggleSelectAll}
                            aria-label="Select all"
                            className="rounded border-[var(--card-border)]"
                          />
                        </th>
                        <th className="px-4 py-3.5 font-medium">Work order</th>
                        <th className="px-3 py-3.5 font-medium">Priority · Status</th>
                        <th className="px-3 py-3.5 font-medium">Scheduled</th>
                        <th className="px-3 py-3.5 font-medium">Assigned</th>
                        <th className="w-24 px-3 py-3.5 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody data-tour="work-orders:completion">
                      {initialList.map((wo) => (
                        <WorkOrderTableRow
                          key={wo.id}
                          wo={wo}
                          selected={selectedIds.has(wo.id)}
                          isActive={detailDrawerRow?.id === wo.id}
                          isPending={isPending}
                          onToggleSelect={toggleSelect}
                          onOpenDetail={setDetailDrawerRow}
                          onChangeStatus={setStatusForRow}
                          onAssign={setAssigningWorkOrder}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalCount={totalCount}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          }
          detailContent={
            detailDrawerRow ? (
              <WorkOrderCommandCenterPane
                workOrder={detailDrawerRow}
                onClose={() => setDetailDrawerRow(null)}
                onAssign={() => {
                  setAssigningWorkOrder(detailDrawerRow);
                  setDetailDrawerRow(null);
                }}
                onEdit={() => {
                  setEditingWorkOrder(detailDrawerRow as WorkOrder);
                  setModalOpen(true);
                  setDetailDrawerRow(null);
                }}
                onStatusChange={(wo, s) => setStatusForRow(wo as WorkOrderListRow, s)}
                isPending={isPending}
              />
            ) : null
          }
          isDetailOpen={!!detailDrawerRow}
          onCloseDetail={() => setDetailDrawerRow(null)}
        />
      )}

      {modalOpen ? (
        <WorkOrderFormModal
          key={editingWorkOrder?.id ?? "new-work-order"}
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
          vendors={vendors}
          saveAction={saveWorkOrder}
        />
      ) : null}

      <CornerstoneAiPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        context={{
          entityType: "list",
          listFilters: { entityType: "work_orders" },
          recordSummary: {
            listSummary: {
              total: stats.open + stats.inProgress + stats.onHold,
              byStatus: {
                open: stats.open,
                in_progress: stats.inProgress,
                on_hold: stats.onHold,
              },
            },
          },
          actionContext: {
            workOrders: initialList.slice(0, 20).map((w) => ({
              id: w.id,
              work_order_number: (w.work_order_number as string | null | undefined) ?? null,
              title: w.title ?? null,
              status: w.status ?? null,
              priority: w.priority ?? null,
              due_date: w.due_date ?? null,
              assigned_technician_id: w.assigned_technician_id ?? null,
              assigned_crew_id: w.assigned_crew_id ?? null,
              vendor_id: w.vendor_id ?? null,
              assigned_to_label:
                !w.assigned_technician_id && !w.assigned_crew_id && !w.vendor_id
                  ? "Unassigned"
                  : assignedDisplay(w),
              location: w.location ?? null,
            })),
            technicians: technicians.map((t) => ({
              id: t.id,
              label: t.name,
            })),
          },
        }}
        initialQuery="Summarize the current open work order queue."
      />
      <HelpDrawer
        title="How to use Work Orders"
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      >
        <p className="mb-3 text-sm text-[var(--muted)]">
          This screen is your home base for managing maintenance jobs. Use it to see what work
          exists, who it is assigned to, and what needs attention today.
        </p>

        <h3 className="mb-1 text-sm font-semibold">What this screen is for</h3>
        <p className="mb-3">
          The Work Orders screen tracks individual maintenance jobs that need to be done. Each row
          represents a task with a status, priority, and assignment.
        </p>

        <h3 className="mb-1 text-sm font-semibold">Who typically uses it</h3>
        <ul className="mb-3 list-disc space-y-1 pl-5">
          <li>Maintenance supervisors</li>
          <li>Dispatchers</li>
          <li>Technicians</li>
          <li>Operations managers</li>
        </ul>

        <h3 className="mb-1 text-sm font-semibold">Key things you can do</h3>
        <ul className="mb-3 list-disc space-y-1 pl-5">
          <li>See all work orders for your tenant.</li>
          <li>Filter by status, priority, technician, and more.</li>
          <li>Open a work order to see full details.</li>
          <li>Update status, schedule, and assignment where you have permission.</li>
        </ul>

        <h3 className="mb-1 text-sm font-semibold">Layout overview</h3>
        <ul className="mb-3 list-disc space-y-1 pl-5">
          <li>
            <strong>Top bar</strong>: title, quick actions, and saved views.
          </li>
          <li>
            <strong>Filters</strong>: choose presets such as Open, In Progress, Overdue, or use
            detailed filters.
          </li>
          <li>
            <strong>Table</strong>: each row is a work order with key fields like number, title,
            status, location, and assigned person.
          </li>
        </ul>

        <h3 className="mb-1 text-sm font-semibold">How to review today&apos;s work</h3>
        <ol className="mb-3 list-decimal space-y-1 pl-5">
          <li>Use the preset views or filters to show open or overdue work.</li>
          <li>Scan the table for high-priority or overdue jobs.</li>
          <li>Click a row to open details in the drawer.</li>
          <li>Update status or assignment as needed.</li>
        </ol>

        <h3 className="mb-1 text-sm font-semibold">Typical flow</h3>
        <p className="mb-1">
          Request submitted → Work order created → Scheduled and assigned → Completed.
        </p>

        <h3 className="mb-1 text-sm font-semibold">Tips</h3>
        <ul className="mb-2 list-disc space-y-1 pl-5">
          <li>Use clear titles so work is easy to find later.</li>
          <li>Keep statuses up to date so the board reflects reality.</li>
          <li>Link work orders to assets when possible so history is complete.</li>
        </ul>
      </HelpDrawer>

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
            assigned_vendor_id: assigningWorkOrder.vendor_id ?? null,
            scheduled_date: assigningWorkOrder.scheduled_date ?? null,
            scheduled_start: assigningWorkOrder.scheduled_start ?? null,
            scheduled_end: assigningWorkOrder.scheduled_end ?? null,
          }}
          technicians={technicians}
          crews={crews}
          vendors={vendors}
          onSuccess={() => {
            setAssigningWorkOrder(null);
            router.refresh();
          }}
        />
      )}
      <WorkOrderSlaSettingsModal
        key={slaModalOpen ? "sla-open" : "sla-closed"}
        open={slaModalOpen}
        onClose={() => setSlaModalOpen(false)}
        companies={companies}
        policies={slaPolicies}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
