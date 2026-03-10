"use client";

import { useTransition, useState, useEffect } from "react";
import { updateWorkOrderAssignment } from "../actions";

type TechnicianOption = { id: string; name: string };
type CrewOption = { id: string; name: string; company_id: string | null };

type WorkOrderAssignmentModalProps = {
  open: boolean;
  onClose: () => void;
  workOrderId: string;
  workOrderStatus?: string;
  companyId: string | null;
  initial: {
    assigned_technician_id: string | null;
    assigned_crew_id: string | null;
    scheduled_date: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
  };
  technicians: TechnicianOption[];
  crews: CrewOption[];
  onSuccess: () => void;
};

const inputClass =
  "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";
const labelClass = "mb-1 block text-xs font-medium text-[var(--muted)]";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function toTimeInputValue(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toTimeString().slice(0, 5);
  } catch {
    return "";
  }
}

export function WorkOrderAssignmentModal({
  open,
  onClose,
  workOrderId,
  workOrderStatus,
  companyId,
  initial,
  technicians,
  crews,
  onSuccess,
}: WorkOrderAssignmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [technicianId, setTechnicianId] = useState("");
  const [crewId, setCrewId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");

  useEffect(() => {
    if (!open) return;
    setTechnicianId(initial.assigned_technician_id ?? "");
    setCrewId(initial.assigned_crew_id ?? "");
    setScheduledDate(toDateInputValue(initial.scheduled_date));
    setScheduledStart(toTimeInputValue(initial.scheduled_start));
    setScheduledEnd(toTimeInputValue(initial.scheduled_end));
    setError(null);
  }, [open, initial.assigned_technician_id, initial.assigned_crew_id, initial.scheduled_date, initial.scheduled_start, initial.scheduled_end]);

  const crewsFiltered = companyId
    ? crews.filter((c) => !c.company_id || c.company_id === companyId)
    : crews;

  const isCompletedOrCancelled =
    workOrderStatus === "completed" || workOrderStatus === "cancelled" || workOrderStatus === "closed";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isCompletedOrCancelled) {
      setError("Cannot change assignment on completed or cancelled work orders.");
      return;
    }

    const startVal = scheduledDate && scheduledStart ? `${scheduledDate}T${scheduledStart}:00` : null;
    const endVal = scheduledDate && scheduledEnd ? `${scheduledDate}T${scheduledEnd}:00` : null;
    if (startVal && endVal && new Date(endVal) < new Date(startVal)) {
      setError("Scheduled end must be after scheduled start.");
      return;
    }

    startTransition(async () => {
      const result = await updateWorkOrderAssignment(workOrderId, {
        assigned_technician_id: technicianId || null,
        assigned_crew_id: crewId || null,
        scheduled_date: scheduledDate || null,
        scheduled_start: startVal,
        scheduled_end: endVal,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess();
      onClose();
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="border-b border-[var(--card-border)] px-4 py-3">
          <h2 id="assignment-modal-title" className="text-lg font-semibold text-[var(--foreground)]">
            Assign work order
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Assign technician or crew and set schedule. Status will move to Ready or Scheduled based on availability.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="assign-modal-technician" className={labelClass}>
              Technician
            </label>
            <select
              id="assign-modal-technician"
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className={inputClass}
            >
              <option value="">None</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assign-modal-crew" className={labelClass}>
              Crew
            </label>
            <select
              id="assign-modal-crew"
              value={crewId}
              onChange={(e) => setCrewId(e.target.value)}
              className={inputClass}
            >
              <option value="">None</option>
              {crewsFiltered.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assign-modal-date" className={labelClass}>
              Scheduled date
            </label>
            <input
              id="assign-modal-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="assign-modal-start" className={labelClass}>
                Start time
              </label>
              <input
                id="assign-modal-start"
                type="time"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="assign-modal-end" className={labelClass}>
                End time
              </label>
              <input
                id="assign-modal-end"
                type="time"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending || isCompletedOrCancelled}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save assignment"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
