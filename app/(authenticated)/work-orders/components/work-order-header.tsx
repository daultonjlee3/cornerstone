"use client";

import Link from "next/link";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { PriorityBadge } from "@/src/components/ui/priority-badge";

const btnBase =
  "rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const btnPrimary =
  "rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

type WorkOrderHeaderProps = {
  workOrderId: string;
  workOrderNumber: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  isCompleted: boolean;
  onAssignTechnician: () => void;
  onAssignCrew: () => void;
  onChangeStatusClick: () => void;
  onCompleteClick: () => void;
  isPending?: boolean;
};

export function WorkOrderHeader({
  workOrderId,
  workOrderNumber,
  title,
  status,
  priority,
  category,
  isCompleted,
  onAssignTechnician,
  onAssignCrew,
  onChangeStatusClick,
  onCompleteClick,
  isPending = false,
}: WorkOrderHeaderProps) {
  return (
    <header className={`rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm ${isCompleted ? "border-emerald-500/20 bg-emerald-500/5" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Work order</p>
          <h1 className="mt-0.5 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
            {workOrderNumber}
          </h1>
          <p className="mt-1 text-[var(--foreground)]">{title}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <PriorityBadge priority={priority} />
            {category && (
              <span className="rounded bg-[var(--muted)]/20 px-2 py-0.5 text-xs text-[var(--muted)]">
                {(category as string).replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/work-orders?edit=${workOrderId}`} className={btnBase}>
            Edit Work Order
          </Link>
          <button type="button" onClick={onAssignTechnician} className={btnBase}>
            Assign Technician
          </button>
          <button type="button" onClick={onAssignCrew} className={btnBase}>
            Assign Crew
          </button>
          <button
            type="button"
            onClick={onChangeStatusClick}
            disabled={isPending}
            className={btnBase}
          >
            Change Status
          </button>
          {!isCompleted && (
            <button
              type="button"
              onClick={onCompleteClick}
              disabled={isPending}
              className={btnPrimary}
            >
              Complete Work Order
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
