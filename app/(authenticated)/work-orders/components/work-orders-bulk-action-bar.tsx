"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  bulkAssignWorkOrders,
  bulkDeleteWorkOrdersDetailed,
  bulkScheduleWorkOrders,
  bulkUpdateWorkOrderPriorityDetailed,
  bulkUpdateWorkOrderStatusDetailed,
  exportWorkOrdersCsv,
} from "../actions";
import { isFatalBulkError, summarizeBulk, type BulkFeedbackMessage } from "./work-orders-bulk-feedback";
import { ActionBar } from "@/src/components/ui/action-bar";
import { Button } from "@/src/components/ui/button";
import { Modal } from "@/src/components/ui/modal";
import { formatDate } from "@/src/lib/date-utils";

const BULK_STATUS_OPTIONS = [
  "new",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "on_hold",
  "cancelled",
] as const;

const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent", "emergency"] as const;

type MenuKey = "status" | "priority" | "more";

type RowSlice = {
  id: string;
  company_id: string;
};

type TechnicianOpt = { id: string; name: string; company_id?: string | null };
type CrewOpt = { id: string; name: string; company_id: string | null };
type VendorOpt = { id: string; name: string; company_id: string; service_type?: string | null };

function statusLabel(s: string): string {
  return s.replace(/_/g, " ");
}

type PortalDropdownProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
  align?: "left" | "right";
};

function PortalDropdown({ open, anchorRef, onClose, children, align = "left" }: PortalDropdownProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    const w = 220;
    let left = align === "right" ? r.right - w : r.left;
    left = Math.min(Math.max(8, left), window.innerWidth - w - 8);
    const top = Math.min(r.bottom + 4, window.innerHeight - 8);
    setStyle({
      position: "fixed",
      top,
      left,
      width: w,
      zIndex: 1200,
    });
  }, [open, anchorRef, align]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      const menu = document.getElementById("work-orders-bulk-portal-menu");
      if (menu?.contains(t)) return;
      onClose();
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="work-orders-bulk-portal-menu"
      role="menu"
      style={style}
      className="max-h-[min(320px,70vh)] overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
    >
      {children}
    </div>,
    document.body
  );
}

type WorkOrdersBulkActionBarProps = {
  selectedIds: Set<string>;
  selectedRows: RowSlice[];
  technicians: TechnicianOpt[];
  crews: CrewOpt[];
  vendors: VendorOpt[];
  onClearSelection: () => void;
  setMessage: (m: BulkFeedbackMessage | null) => void;
  onRefresh: () => void;
};

type AssignMode = "technician" | "crew" | "vendor";

export function WorkOrdersBulkActionBar({
  selectedIds,
  selectedRows,
  technicians,
  crews,
  vendors,
  onClearSelection,
  setMessage,
  onRefresh,
}: WorkOrdersBulkActionBarProps) {
  const [isPending, startTransition] = useTransition();
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const priorityBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const ids = Array.from(selectedIds);
  const n = ids.length;

  const companyIds = [...new Set(selectedRows.map((r) => r.company_id).filter(Boolean))];
  const singleCompany = companyIds.length === 1 ? companyIds[0] : null;

  const [assignMode, setAssignMode] = useState<AssignMode>("technician");
  const [techId, setTechId] = useState("");
  const [crewId, setCrewId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  const [schedDate, setSchedDate] = useState("");
  const [schedStart, setSchedStart] = useState("");
  const [schedEnd, setSchedEnd] = useState("");
  const [schedError, setSchedError] = useState<string | null>(null);

  const closeMenus = useCallback(() => setOpenMenu(null), []);

  const crewsFiltered = singleCompany
    ? crews.filter((c) => !c.company_id || c.company_id === singleCompany)
    : crews;
  const vendorsFiltered = singleCompany
    ? vendors.filter((v) => v.company_id === singleCompany)
    : vendors;
  const techsForCompany = singleCompany
    ? technicians.filter((t) => !t.company_id || t.company_id === singleCompany)
    : technicians;

  const runBulk = useCallback(
    (fn: () => Promise<void>) => {
      startTransition(() => {
        void fn();
      });
    },
    [startTransition]
  );

  const handleStatusPick = (s: string) => {
    closeMenus();
    runBulk(async () => {
      const r = await bulkUpdateWorkOrderStatusDetailed(ids, s);
      setMessage(summarizeBulk(`set to ${statusLabel(s)}`, r));
      if (!isFatalBulkError(r) && r.succeeded > 0) {
        onClearSelection();
        onRefresh();
      }
    });
  };

  const handlePriorityPick = (p: string) => {
    closeMenus();
    runBulk(async () => {
      const r = await bulkUpdateWorkOrderPriorityDetailed(ids, p);
      setMessage(summarizeBulk(`updated to priority “${p}”`, r));
      if (!isFatalBulkError(r) && r.succeeded > 0) {
        onClearSelection();
        onRefresh();
      }
    });
  };

  const handleExport = async () => {
    closeMenus();
    const r = await exportWorkOrdersCsv(ids);
    if (r.error) {
      setMessage({ type: "error", text: r.error });
      return;
    }
    const blob = new Blob([r.data!], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-orders-selected-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "success", text: `Exported ${n} work order${n === 1 ? "" : "s"}.` });
  };

  const handleDeleteConfirm = () => {
    setDeleteOpen(false);
    runBulk(async () => {
      const r = await bulkDeleteWorkOrdersDetailed(ids);
      setMessage(summarizeBulk("permanently deleted from the database", r));
      if (!isFatalBulkError(r) && r.succeeded > 0) {
        onClearSelection();
        onRefresh();
      }
    });
  };

  const openAssign = () => {
    closeMenus();
    setAssignError(null);
    setAssignMode("technician");
    setTechId("");
    setCrewId("");
    setVendorId("");
    setAssignOpen(true);
  };

  const submitAssign = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);
    if (!singleCompany) {
      setAssignError("Bulk assign requires all selected work orders to belong to the same company.");
      return;
    }
    const nextTech = assignMode === "technician" ? techId || null : null;
    const nextCrew = assignMode === "crew" ? crewId || null : null;
    const nextVendor = assignMode === "vendor" ? vendorId || null : null;
    if (!nextTech && !nextCrew && !nextVendor) {
      setAssignError("Choose a technician, crew, or vendor—or use Unassigned in a future update.");
      return;
    }
    setAssignOpen(false);
    runBulk(async () => {
      const r = await bulkAssignWorkOrders(ids, {
        assigned_technician_id: nextTech,
        assigned_crew_id: nextCrew,
        assigned_vendor_id: nextVendor,
      });
      const name =
        nextTech ? techsForCompany.find((t) => t.id === nextTech)?.name ?? "technician" : nextCrew ? crewsFiltered.find((c) => c.id === nextCrew)?.name ?? "crew" : vendorsFiltered.find((v) => v.id === nextVendor)?.name ?? "vendor";
      setMessage(summarizeBulk(`assigned to ${name}`, r));
      if (!isFatalBulkError(r) && r.succeeded > 0) {
        onClearSelection();
        onRefresh();
      }
    });
  };

  const submitSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setSchedError(null);
    const startLocal = schedDate && schedStart ? `${schedDate}T${schedStart}:00` : null;
    const endLocal = schedDate && schedEnd ? `${schedDate}T${schedEnd}:00` : null;
    if (startLocal && endLocal && new Date(endLocal) < new Date(startLocal)) {
      setSchedError("Scheduled end must be after start.");
      return;
    }
    const startISO = startLocal ? new Date(startLocal).toISOString() : null;
    const endISO = endLocal ? new Date(endLocal).toISOString() : null;
    setScheduleOpen(false);
    runBulk(async () => {
      const r = await bulkScheduleWorkOrders(ids, {
        scheduled_date: schedDate.trim() || null,
        scheduled_start: startISO,
        scheduled_end: endISO,
      });
      const when = schedDate.trim()
        ? `${formatDate(schedDate)}${schedStart ? ` · ${schedStart}` : ""}${schedEnd ? `–${schedEnd}` : ""}`
        : "cleared";
      setMessage(summarizeBulk(`scheduled (${when})`, r));
      if (!isFatalBulkError(r) && r.succeeded > 0) {
        onClearSelection();
        onRefresh();
      }
    });
  };

  if (n === 0) return null;

  return (
    <>
      <ActionBar className="flex flex-wrap items-center gap-2 border-[var(--accent)]/30 bg-[var(--accent)]/5 sm:gap-3">
        <span className="min-w-0 shrink-0 text-sm font-semibold text-[var(--foreground)]">{n} selected</span>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="h-9 min-h-9 px-3 text-sm"
            disabled={isPending}
            onClick={openAssign}
          >
            Assign
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 min-h-9 px-3 text-sm"
            disabled={isPending}
            onClick={() => {
              closeMenus();
              setSchedError(null);
              setSchedDate("");
              setSchedStart("");
              setSchedEnd("");
              setScheduleOpen(true);
            }}
          >
            Schedule
          </Button>

          <div className="relative">
            <Button
              ref={statusBtnRef}
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 min-h-9 min-w-[5.5rem] px-3 text-sm"
              disabled={isPending}
              aria-expanded={openMenu === "status"}
              aria-haspopup="menu"
              onClick={() => setOpenMenu((m) => (m === "status" ? null : "status"))}
            >
              Status ▾
            </Button>
            <PortalDropdown
              open={openMenu === "status"}
              anchorRef={statusBtnRef}
              onClose={closeMenus}
              align="left"
            >
              {BULK_STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="menuitem"
                  disabled={isPending}
                  onClick={() => handleStatusPick(s)}
                  className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
                >
                  {statusLabel(s)}
                </button>
              ))}
            </PortalDropdown>
          </div>

          <div className="relative">
            <Button
              ref={priorityBtnRef}
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 min-h-9 min-w-[5.5rem] px-3 text-sm"
              disabled={isPending}
              aria-expanded={openMenu === "priority"}
              aria-haspopup="menu"
              onClick={() => setOpenMenu((m) => (m === "priority" ? null : "priority"))}
            >
              Priority ▾
            </Button>
            <PortalDropdown
              open={openMenu === "priority"}
              anchorRef={priorityBtnRef}
              onClose={closeMenus}
              align="left"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="menuitem"
                  disabled={isPending}
                  onClick={() => handlePriorityPick(p)}
                  className="block w-full px-3 py-2 text-left text-sm capitalize text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </PortalDropdown>
          </div>

          <div className="relative">
            <Button
              ref={moreBtnRef}
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 min-h-9 px-3 text-sm"
              disabled={isPending}
              aria-expanded={openMenu === "more"}
              aria-haspopup="menu"
              onClick={() => setOpenMenu((m) => (m === "more" ? null : "more"))}
            >
              More ▾
            </Button>
            <PortalDropdown open={openMenu === "more"} anchorRef={moreBtnRef} onClose={closeMenus} align="right">
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
                onClick={() => void handleExport()}
              >
                Export selected…
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400"
                onClick={() => {
                  closeMenus();
                  setDeleteOpen(true);
                }}
              >
                Delete selected…
              </button>
            </PortalDropdown>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 min-h-9 shrink-0 px-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={onClearSelection}
        >
          Clear selection
        </Button>
      </ActionBar>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={`Assign ${n} work order${n === 1 ? "" : "s"}`}
        description={
          singleCompany
            ? "Assign all selected work orders to one technician, crew, or vendor. Existing schedule on each work order is kept."
            : "Select work orders from a single company to use bulk assign."
        }
        className="max-w-md"
      >
        <form onSubmit={submitAssign} className="space-y-4">
          {assignError && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {assignError}
            </p>
          )}
          {!singleCompany ? null : (
            <>
              <div className="flex flex-wrap gap-2">
                {(["technician", "crew", "vendor"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize ${
                      assignMode === m
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--background)]"
                    }`}
                    onClick={() => setAssignMode(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {assignMode === "technician" ? (
                <div>
                  <label className="ui-label" htmlFor="bulk-assign-tech">
                    Technician
                  </label>
                  <select
                    id="bulk-assign-tech"
                    className="ui-select mt-1 w-full"
                    value={techId}
                    onChange={(e) => setTechId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {techsForCompany.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {assignMode === "crew" ? (
                <div>
                  <label className="ui-label" htmlFor="bulk-assign-crew">
                    Crew
                  </label>
                  <select
                    id="bulk-assign-crew"
                    className="ui-select mt-1 w-full"
                    value={crewId}
                    onChange={(e) => setCrewId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {crewsFiltered.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {assignMode === "vendor" ? (
                <div>
                  <label className="ui-label" htmlFor="bulk-assign-vendor">
                    Vendor
                  </label>
                  <select
                    id="bulk-assign-vendor"
                    className="ui-select mt-1 w-full"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {vendorsFiltered.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                        {v.service_type ? ` (${v.service_type})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setAssignOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Applying…" : `Apply to ${n}`}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title={`Schedule ${n} work order${n === 1 ? "" : "s"}`}
        description="Set scheduled date and optional start/end times. Clears times if you leave time fields empty. Leave date empty to clear scheduling on selected work orders."
        className="max-w-md"
      >
        <form onSubmit={submitSchedule} className="space-y-4">
          {schedError && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {schedError}
            </p>
          )}
          <div>
            <label className="ui-label" htmlFor="bulk-sched-date">
              Scheduled date
            </label>
            <input
              id="bulk-sched-date"
              type="date"
              className="ui-input mt-1 w-full"
              value={schedDate}
              onChange={(e) => setSchedDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ui-label" htmlFor="bulk-sched-start">
                Start time
              </label>
              <input
                id="bulk-sched-start"
                type="time"
                className="ui-input mt-1 w-full"
                value={schedStart}
                onChange={(e) => setSchedStart(e.target.value)}
              />
            </div>
            <div>
              <label className="ui-label" htmlFor="bulk-sched-end">
                End time
              </label>
              <input
                id="bulk-sched-end"
                type="time"
                className="ui-input mt-1 w-full"
                value={schedEnd}
                onChange={(e) => setSchedEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Applying…" : `Apply to ${n}`}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Permanently delete work orders?"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--foreground)]">
            You are about to <strong>permanently delete</strong>{" "}
            <strong>{n}</strong> work order{n === 1 ? "" : "s"} from the database. This is not reversible. Audit
            logs will record the deletion where configured.
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Only continue if these records should be removed entirely. There is no archive or soft-delete for this
            action.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isPending}
              onClick={handleDeleteConfirm}
            >
              {isPending ? "Deleting…" : `Delete ${n}`}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
