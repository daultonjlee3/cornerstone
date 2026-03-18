"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useTransition } from "react";
import { useIsLg } from "@/src/lib/use-media-query";
import {
  DetailDrawer,
  DetailDrawerBody,
  DetailHeader,
  DetailTabs,
  DetailActionBar,
} from "@/src/components/command-center";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { PriorityBadge } from "@/src/components/ui/priority-badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/ui/tooltip";
import { formatDate } from "@/src/lib/date-utils";
import { formatDateTime } from "./detail-utils";
import { getWorkOrderPaneData, toggleWorkOrderChecklistItem } from "../actions";
import { WorkOrderStatusTimeline } from "./work-order-status-timeline";
import { WorkOrderChecklistCard } from "./work-order-checklist-card";
import { WorkOrderNotesCard } from "./work-order-notes-card";
import { WorkOrderPartsCard } from "./work-order-parts-card";
import type { WorkOrderListRow } from "./work-order-detail-drawer";

const STATUS_OPTIONS = [
  "new",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "on_hold",
  "cancelled",
] as const;

function assignedDisplay(wo: WorkOrderListRow): string {
  const tech = wo.technician_name;
  const crew = wo.crew_name;
  if (tech && crew) return `${tech} / ${crew}`;
  if (tech) return tech;
  if (crew) return crew;
  return "Unassigned";
}

export type WorkOrderCommandCenterPaneProps = {
  workOrder: WorkOrderListRow;
  onClose: () => void;
  onAssign: () => void;
  onEdit: () => void;
  onStatusChange: (wo: WorkOrderListRow, status: string) => void;
  isPending?: boolean;
};

type PaneData = Awaited<ReturnType<typeof getWorkOrderPaneData>>["data"];

export function WorkOrderCommandCenterPane({
  workOrder,
  onClose,
  onAssign,
  onEdit,
  onStatusChange,
  isPending = false,
}: WorkOrderCommandCenterPaneProps) {
  const isLg = useIsLg();
  const showBack = !isLg;
  const [statusOpen, setStatusOpen] = useState(false);
  const [paneData, setPaneData] = useState<PaneData | null>(null);
  const [paneLoading, setPaneLoading] = useState(true);
  const [paneError, setPaneError] = useState<string | null>(null);
  const [taskPending, startTaskTransition] = useTransition();

  const refetch = useCallback(() => {
    getWorkOrderPaneData(workOrder.id).then((res) => {
      if (res.error) setPaneError(res.error);
      else setPaneData(res.data ?? null);
    });
  }, [workOrder.id]);

  useEffect(() => {
    setPaneError(null);
    setPaneLoading(true);
    getWorkOrderPaneData(workOrder.id).then((res) => {
      setPaneLoading(false);
      if (res.error) setPaneError(res.error);
      else setPaneData(res.data ?? null);
    });
  }, [workOrder.id]);

  const today = new Date().toISOString().slice(0, 10);
  const dueDate = workOrder.due_date as string | null | undefined;
  const isOverdue =
    !!dueDate &&
    dueDate < today &&
    workOrder.status !== "completed" &&
    workOrder.status !== "cancelled";

  const description = (workOrder.description as string | null | undefined) ?? "";
  const requestedByName = (workOrder.requested_by_name as string | null | undefined) ?? null;
  const requestedByEmail = (workOrder.requested_by_email as string | null | undefined) ?? null;

  const labelClass = "text-xs font-normal text-[var(--muted)]";
  const valueClass = "text-sm font-medium text-[var(--foreground)] mt-0.5";
  const detailsTab = (
    <div className="p-5">
      {/* Status + Priority */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={workOrder.status ?? "new"} />
          <PriorityBadge priority={workOrder.priority ?? "medium"} />
          {isOverdue && (
            <span className="ui-badge border-red-200 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700">
              Overdue
            </span>
          )}
        </div>
        {/* Assignment + Dates */}
        <div className="grid gap-3 pt-2">
          <div>
            <dt className={labelClass}>Assigned to</dt>
            <dd className={valueClass}>{assignedDisplay(workOrder)}</dd>
          </div>
          <div>
            <dt className={labelClass}>Due date</dt>
            <dd className={valueClass}>{formatDate(workOrder.due_date)}</dd>
          </div>
          <div>
            <dt className={labelClass}>Scheduled</dt>
            <dd className={valueClass}>{formatDate(workOrder.scheduled_date)}</dd>
          </div>
        </div>
        {/* Location + Asset */}
        <div className="grid gap-3 pt-2 border-t border-[var(--card-border)]/60">
          {(workOrder.location ?? workOrder.property_name ?? workOrder.building_name) && (
            <div>
              <dt className={labelClass}>Location</dt>
              <dd className={valueClass}>
                {workOrder.location ?? [workOrder.property_name, workOrder.building_name].filter(Boolean).join(" / ") ?? "—"}
              </dd>
            </div>
          )}
          {workOrder.asset_name && (
            <div>
              <dt className={labelClass}>Asset</dt>
              <dd className={valueClass}>{workOrder.asset_name}</dd>
            </div>
          )}
          <div>
            <dt className={labelClass}>Source</dt>
            <dd className={valueClass}>
              {workOrder.source_type === "preventive_maintenance" ? (
                workOrder.preventive_maintenance_plan_id ? (
                  <Link
                    href={`/preventive-maintenance/${workOrder.preventive_maintenance_plan_id}`}
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
            </dd>
          </div>
        </div>
        {requestedByName && (
          <div className="pt-2 border-t border-[var(--card-border)]/60">
            <dt className={labelClass}>Requested by</dt>
            <dd className={valueClass}>
              {requestedByName}
              {requestedByEmail ? ` (${requestedByEmail})` : ""}
            </dd>
          </div>
        )}
      </div>
      <div className="mt-6 pt-4 border-t border-[var(--card-border)]/60">
        <h3 className={labelClass}>Description</h3>
        {description ? (
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">{description}</p>
        ) : (
          <p className="mt-1.5 text-sm text-[var(--muted)]">No description.</p>
        )}
      </div>
    </div>
  );

  const activityTab = (
    <div className="p-5">
      {paneLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading activity…</p>
      ) : paneError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{paneError}</p>
      ) : paneData ? (
        <WorkOrderStatusTimeline entries={paneData.statusHistory} />
      ) : (
        <p className="text-sm text-[var(--muted)]">No activity yet.</p>
      )}
    </div>
  );

  const tasksTab = (
    <div className="p-5">
      {paneLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading tasks…</p>
      ) : paneError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{paneError}</p>
      ) : paneData ? (
        <WorkOrderChecklistCard
          workOrderId={workOrder.id}
          items={paneData.checklistItems}
          onToggle={(itemId, completed) => {
            startTaskTransition(async () => {
              const result = await toggleWorkOrderChecklistItem(itemId, !completed);
              if (!result.error) refetch();
            });
          }}
          onItemsChange={refetch}
          isPending={taskPending}
        />
      ) : (
        <p className="text-sm text-[var(--muted)]">No checklist items.</p>
      )}
    </div>
  );

  const notesTab = (
    <div className="p-5">
      {paneLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading notes…</p>
      ) : paneError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{paneError}</p>
      ) : paneData ? (
        <WorkOrderNotesCard
          workOrderId={workOrder.id}
          notes={paneData.notes}
          onNotesChange={refetch}
        />
      ) : (
        <p className="text-sm text-[var(--muted)]">No notes yet.</p>
      )}
    </div>
  );

  const partsTab = (
    <div className="p-5">
      {paneLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading parts…</p>
      ) : paneError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{paneError}</p>
      ) : paneData ? (
        <WorkOrderPartsCard
          workOrderId={workOrder.id}
          partUsage={paneData.partUsage}
          onPartsChange={refetch}
          inventoryItems={paneData.inventoryItems}
        />
      ) : (
        <p className="text-sm text-[var(--muted)]">No parts added yet.</p>
      )}
    </div>
  );

  const photoAttachments =
    paneData?.attachments?.filter((a) => (a.file_type ?? "").startsWith("image/")) ?? [];
  const photosTab = (
    <div className="p-5">
      {paneLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading photos…</p>
      ) : paneError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{paneError}</p>
      ) : photoAttachments.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No photos uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photoAttachments.map((att) => (
            <a
              key={att.id}
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--background)] transition-shadow hover:shadow-md"
            >
              <img
                src={att.file_url}
                alt={att.caption ?? att.file_name ?? "Photo"}
                className="aspect-square w-full object-cover"
              />
              <div className="p-2">
                <p className="truncate text-xs font-medium text-[var(--foreground)]">
                  {att.caption ?? att.file_name ?? "Photo"}
                </p>
                <p className="text-[10px] text-[var(--muted)]">
                  {formatDateTime(att.uploaded_at ?? att.created_at)}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: "details", label: "Details", content: detailsTab },
    { id: "activity", label: "Activity", content: activityTab },
    { id: "tasks", label: "Tasks", content: tasksTab },
    { id: "notes", label: "Notes", content: notesTab },
    { id: "parts", label: "Parts", content: partsTab },
    { id: "photos", label: "Photos", content: photosTab },
  ];

  return (
    <DetailDrawer>
      <DetailHeader
        title={workOrder.work_order_number ?? workOrder.id.slice(0, 8)}
        subtitle={workOrder.title}
        badges={
          <>
            <StatusBadge status={workOrder.status ?? "new"} />
            <PriorityBadge priority={workOrder.priority ?? "medium"} />
            {isOverdue && (
              <span className="ui-badge border-red-200 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700">
                Overdue
              </span>
            )}
          </>
        }
        viewFullHref={`/work-orders/${workOrder.id}`}
        onClose={onClose}
        showBack={showBack}
      />
      <DetailDrawerBody className="flex flex-col">
        <DetailTabs tabs={tabs} defaultTabId="details" className="flex-1 min-h-0" />
      </DetailDrawerBody>
      <DetailActionBar stickyBottom={showBack}>
        <Tooltip placement="top">
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onAssign}
              className="rounded-lg border border-[var(--card-border)]/80 bg-[var(--background)] px-3 py-2 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--background)]/90"
            >
              Assign
            </button>
          </TooltipTrigger>
          <TooltipContent>Assign technician or crew</TooltipContent>
        </Tooltip>
        <div className="relative">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setStatusOpen((v) => !v)}
            className="rounded-lg border border-[var(--card-border)]/80 bg-[var(--background)] px-3 py-2 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--background)]/90 disabled:opacity-50"
          >
            Change status
          </button>
          {statusOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setStatusOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      onStatusChange(workOrder, s);
                      setStatusOpen(false);
                    }}
                    disabled={isPending}
                    className="block w-full px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="rounded-lg border border-[var(--card-border)]/80 bg-[var(--background)] px-3 py-2 text-[13px] font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--background)]/90"
        >
          Edit
        </button>
        <Link
          href={`/work-orders/${workOrder.id}#notes`}
          className="rounded-lg bg-[var(--accent)]/90 px-3 py-2 text-[13px] font-medium text-white transition-opacity duration-150 hover:bg-[var(--accent-hover)]"
        >
          Add note
        </Link>
      </DetailActionBar>
    </DetailDrawer>
  );
}
