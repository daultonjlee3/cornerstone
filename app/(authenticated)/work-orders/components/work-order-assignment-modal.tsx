"use client";

import { useTransition, useState } from "react";
import { updateWorkOrderAssignment } from "../actions";
import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import { FormField } from "@/src/components/ui/form-field";

type TechnicianOption = { id: string; name: string };
type CrewOption = { id: string; name: string; company_id: string | null };
type VendorOption = { id: string; name: string; company_id: string; service_type?: string | null };

type WorkOrderAssignmentModalProps = {
  open: boolean;
  onClose: () => void;
  workOrderId: string;
  workOrderStatus?: string;
  companyId: string | null;
  initial: {
    assigned_technician_id: string | null;
    assigned_crew_id: string | null;
    assigned_vendor_id?: string | null;
    scheduled_date: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
  };
  technicians: TechnicianOption[];
  crews: CrewOption[];
  vendors?: VendorOption[];
  onSuccess: () => void;
};

type AssignmentMode = "none" | "technician" | "crew" | "vendor";

function deriveAssignmentMode(initial: {
  assigned_technician_id: string | null;
  assigned_crew_id: string | null;
  assigned_vendor_id?: string | null;
}): AssignmentMode {
  if (initial.assigned_technician_id) return "technician";
  if (initial.assigned_crew_id) return "crew";
  if (initial.assigned_vendor_id) return "vendor";
  return "none";
}

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
  vendors = [],
  onSuccess,
}: WorkOrderAssignmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const defaultMode = deriveAssignmentMode(initial);
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>(defaultMode);
  const [technicianId, setTechnicianId] = useState(
    defaultMode === "technician" ? initial.assigned_technician_id ?? "" : ""
  );
  const [crewId, setCrewId] = useState(
    defaultMode === "crew" ? initial.assigned_crew_id ?? "" : ""
  );
  const [vendorId, setVendorId] = useState(
    defaultMode === "vendor" ? initial.assigned_vendor_id ?? "" : ""
  );
  const [scheduledDate, setScheduledDate] = useState(
    toDateInputValue(initial.scheduled_date)
  );
  const [scheduledStart, setScheduledStart] = useState(
    toTimeInputValue(initial.scheduled_start)
  );
  const [scheduledEnd, setScheduledEnd] = useState(
    toTimeInputValue(initial.scheduled_end)
  );

  const crewsFiltered = companyId
    ? crews.filter((c) => !c.company_id || c.company_id === companyId)
    : crews;
  const vendorsFiltered = companyId
    ? vendors.filter((vendor) => vendor.company_id === companyId)
    : vendors;

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
      const nextVendorId = assignmentMode === "vendor" ? vendorId || null : null;
      const result = await updateWorkOrderAssignment(workOrderId, {
        assigned_technician_id: nextTechnicianId,
        assigned_crew_id: nextCrewId,
        assigned_vendor_id: nextVendorId,
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
      description="Assign to one technician, crew, or external vendor, then schedule the work."
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
            <div className="grid grid-cols-4 gap-2">
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
                  setVendorId("");
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
                  setVendorId("");
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
                  setVendorId("");
                }}
              >
                Crew
              </button>
              <button
                type="button"
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  assignmentMode === "vendor"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--background)]"
                }`}
                onClick={() => {
                  setAssignmentMode("vendor");
                  setTechnicianId("");
                  setCrewId("");
                }}
              >
                Vendor
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
          <FormField label="External vendor" htmlFor="assign-modal-vendor">
            <select
              id="assign-modal-vendor"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              disabled={assignmentMode !== "vendor"}
              className="ui-select disabled:cursor-not-allowed disabled:bg-[var(--background)] disabled:text-[var(--muted)]"
            >
              <option value="">None</option>
              {vendorsFiltered.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                  {vendor.service_type ? ` (${vendor.service_type})` : ""}
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
