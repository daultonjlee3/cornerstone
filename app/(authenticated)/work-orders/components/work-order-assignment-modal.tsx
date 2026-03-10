"use client";

import { useTransition, useState, useEffect } from "react";
import { updateWorkOrderAssignment } from "../actions";
import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import { FormField } from "@/src/components/ui/form-field";

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

type AssignmentMode = "none" | "technician" | "crew";

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
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("none");
  const [technicianId, setTechnicianId] = useState("");
  const [crewId, setCrewId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");

  useEffect(() => {
    if (!open) return;
    const nextMode: AssignmentMode = initial.assigned_technician_id
      ? "technician"
      : initial.assigned_crew_id
        ? "crew"
        : "none";
    setAssignmentMode(nextMode);
    setTechnicianId(nextMode === "technician" ? initial.assigned_technician_id ?? "" : "");
    setCrewId(nextMode === "crew" ? initial.assigned_crew_id ?? "" : "");
    setScheduledDate(toDateInputValue(initial.scheduled_date));
    setScheduledStart(toTimeInputValue(initial.scheduled_start));
    setScheduledEnd(toTimeInputValue(initial.scheduled_end));
    setError(null);
  }, [
    open,
    initial.assigned_technician_id,
    initial.assigned_crew_id,
    initial.scheduled_date,
    initial.scheduled_start,
    initial.scheduled_end,
  ]);

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
      const nextTechnicianId = assignmentMode === "technician" ? technicianId || null : null;
      const nextCrewId = assignmentMode === "crew" ? crewId || null : null;
      const result = await updateWorkOrderAssignment(workOrderId, {
        assigned_technician_id: nextTechnicianId,
        assigned_crew_id: nextCrewId,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign work order"
      description="Assign to one technician or one crew, then schedule the work."
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </div>
          )}
          <div>
            <p className="ui-label">Assignment type</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  assignmentMode === "none"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--background)]"
                }`}
                onClick={() => {
                  setAssignmentMode("none");
                  setTechnicianId("");
                  setCrewId("");
                }}
              >
                Unassigned
              </button>
              <button
                type="button"
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  assignmentMode === "technician"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--background)]"
                }`}
                onClick={() => {
                  setAssignmentMode("technician");
                  setCrewId("");
                }}
              >
                Technician
              </button>
              <button
                type="button"
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  assignmentMode === "crew"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--background)]"
                }`}
                onClick={() => {
                  setAssignmentMode("crew");
                  setTechnicianId("");
                }}
              >
                Crew
              </button>
            </div>
          </div>
          <FormField label="Technician" htmlFor="assign-modal-technician">
            <select
              id="assign-modal-technician"
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              disabled={assignmentMode !== "technician"}
              className="ui-select disabled:cursor-not-allowed disabled:bg-[var(--background)] disabled:text-[var(--muted)]"
            >
              <option value="">None</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Crew" htmlFor="assign-modal-crew">
            <select
              id="assign-modal-crew"
              value={crewId}
              onChange={(e) => setCrewId(e.target.value)}
              disabled={assignmentMode !== "crew"}
              className="ui-select disabled:cursor-not-allowed disabled:bg-[var(--background)] disabled:text-[var(--muted)]"
            >
              <option value="">None</option>
              {crewsFiltered.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Scheduled date" htmlFor="assign-modal-date">
            <input
              id="assign-modal-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="ui-input"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start time" htmlFor="assign-modal-start">
              <input
                id="assign-modal-start"
                type="time"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="ui-input"
              />
            </FormField>
            <FormField label="End time" htmlFor="assign-modal-end">
              <input
                id="assign-modal-end"
                type="time"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                className="ui-input"
              />
            </FormField>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending || isCompletedOrCancelled}>
              {isPending ? "Saving…" : "Save assignment"}
            </Button>
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
          </div>
      </form>
    </Modal>
  );
}
