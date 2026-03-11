import Link from "next/link";
import { PriorityBadge } from "@/src/components/ui/priority-badge";
import { StatusBadge } from "@/src/components/ui/status-badge";
import type { TechnicianPortalJob } from "./job-types";

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Not scheduled";
  const time = (value: string | null) =>
    value
      ? new Date(value).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";
  if (start && end) return `${time(start)} - ${time(end)}`;
  if (start) return `From ${time(start)}`;
  return `Until ${time(end)}`;
}

function formatDate(value: string | null): string {
  if (!value) return "Unscheduled";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type TechnicianJobCardProps = {
  job: TechnicianPortalJob;
};

export function TechnicianJobCard({ job }: TechnicianJobCardProps) {
  return (
    <Link
      href={`/technician/jobs/${job.id}`}
      className="block rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)] transition hover:border-[var(--accent)]/35 hover:shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {job.workOrderNumber ?? "Work order"}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-tight text-[var(--foreground)]">
            {job.title}
          </h3>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <p className="mt-2 text-sm text-[var(--muted-strong)]">
        {[job.assetName, job.location].filter(Boolean).join(" • ") || "Asset / location not set"}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={job.priority} />
        <span className="rounded-full border border-[var(--card-border)] bg-[var(--background)] px-2 py-0.5 text-xs font-medium text-[var(--muted-strong)]">
          {job.isPm ? "PM" : "Reactive"}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            job.assignmentScope === "direct"
              ? "bg-blue-100 text-blue-700"
              : "bg-teal-100 text-teal-700"
          }`}
        >
          {job.assignmentScope === "direct"
            ? "Assigned to me"
            : `Crew: ${job.assignedCrewName ?? "Assigned crew"}`}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)]/65 px-3 py-2">
        <p className="text-xs font-medium text-[var(--muted)]">
          Due: {formatDate(job.dueDate)}
        </p>
        <p className="text-xs font-medium text-[var(--muted)]">
          Scheduled: {formatDate(job.scheduledDate)}
        </p>
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {formatTimeRange(job.scheduledStart, job.scheduledEnd)}
        </p>
      </div>
    </Link>
  );
}
