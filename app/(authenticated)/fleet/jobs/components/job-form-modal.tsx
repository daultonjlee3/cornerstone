"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";

export type FleetJob = {
  id: string;
  branch_id: string;
  customer_site_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  revenue_estimate: number;
  required_truck_type: string;
  assigned_truck_id: string | null;
};

type BranchOption = { id: string; name: string };
type SiteOption = { id: string; name: string };
type TruckOption = { id: string; unit_number: string };

type JobFormModalProps = {
  open: boolean;
  onClose: () => void;
  job: FleetJob | null;
  branches: BranchOption[];
  sites: SiteOption[];
  trucks: TruckOption[];
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

const emptyJob: FleetJob = {
  id: "",
  branch_id: "",
  customer_site_id: "",
  title: "",
  description: null,
  status: "unassigned",
  priority: "medium",
  scheduled_start: null,
  scheduled_end: null,
  revenue_estimate: 0,
  required_truck_type: "",
  assigned_truck_id: null,
};

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function JobFormModal({
  open,
  onClose,
  job,
  branches,
  sites,
  trucks,
  saveAction,
}: JobFormModalProps) {
  const isEdit = !!job?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const j = job ?? emptyJob;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Job" : "New Job"}
      className="max-w-lg"
    >
      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={j.id} />}
        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        )}
        <FormField label="Title" htmlFor="title" required>
          <input id="title" name="title" type="text" required defaultValue={j.title} className="ui-input" />
        </FormField>
        <FormField label="Branch" htmlFor="branch_id" required>
          <select id="branch_id" name="branch_id" required defaultValue={j.branch_id} className="ui-select">
            <option value="">Select branch…</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Customer site" htmlFor="customer_site_id" required>
          <select
            id="customer_site_id"
            name="customer_site_id"
            required
            defaultValue={j.customer_site_id}
            className="ui-select"
          >
            <option value="">Select site…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Required truck type" htmlFor="required_truck_type" required>
          <input
            id="required_truck_type"
            name="required_truck_type"
            type="text"
            required
            defaultValue={j.required_truck_type}
            className="ui-input"
          />
        </FormField>
        <FormField label="Revenue estimate ($)" htmlFor="revenue_estimate" required>
          <input
            id="revenue_estimate"
            name="revenue_estimate"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={j.revenue_estimate}
            className="ui-input"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status" htmlFor="status">
            <select id="status" name="status" defaultValue={j.status} className="ui-select">
              <option value="unassigned">Unassigned</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>
          <FormField label="Priority" htmlFor="priority">
            <select id="priority" name="priority" defaultValue={j.priority} className="ui-select">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </FormField>
        </div>
        <FormField label="Assigned truck" htmlFor="assigned_truck_id">
          <select
            id="assigned_truck_id"
            name="assigned_truck_id"
            defaultValue={j.assigned_truck_id ?? ""}
            className="ui-select"
          >
            <option value="">Unassigned</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.unit_number}
              </option>
            ))}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Scheduled start" htmlFor="scheduled_start">
            <input
              id="scheduled_start"
              name="scheduled_start"
              type="datetime-local"
              defaultValue={toDatetimeLocal(j.scheduled_start)}
              className="ui-input"
            />
          </FormField>
          <FormField label="Scheduled end" htmlFor="scheduled_end">
            <input
              id="scheduled_end"
              name="scheduled_end"
              type="datetime-local"
              defaultValue={toDatetimeLocal(j.scheduled_end)}
              className="ui-input"
            />
          </FormField>
        </div>
        <FormField label="Description" htmlFor="description">
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={j.description ?? ""}
            className="ui-input"
          />
        </FormField>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Saving…" : isEdit ? "Save" : "Create"}
          </Button>
          <Button type="button" onClick={onClose} variant="secondary">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
