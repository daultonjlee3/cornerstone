"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";

export type FleetOperator = {
  id: string;
  branch_id: string;
  name: string;
  operator_role: string;
  is_active: boolean;
  hourly_cost: number | null;
  overtime_rate: number | null;
  shift: string | null;
};

type BranchOption = { id: string; name: string };

type OperatorFormModalProps = {
  open: boolean;
  onClose: () => void;
  operator: FleetOperator | null;
  branches: BranchOption[];
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

const emptyOperator: FleetOperator = {
  id: "",
  branch_id: "",
  name: "",
  operator_role: "driver",
  is_active: true,
  hourly_cost: null,
  overtime_rate: null,
  shift: null,
};

export function OperatorFormModal({
  open,
  onClose,
  operator,
  branches,
  saveAction,
}: OperatorFormModalProps) {
  const isEdit = !!operator?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const o = operator ?? emptyOperator;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Operator" : "New Operator"}
      className="max-w-md"
    >
      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={o.id} />}
        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        )}
        <FormField label="Branch" htmlFor="branch_id" required>
          <select
            id="branch_id"
            name="branch_id"
            required
            defaultValue={o.branch_id}
            className="ui-select"
          >
            <option value="">Select branch…</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Name" htmlFor="name" required>
          <input id="name" name="name" type="text" required defaultValue={o.name} className="ui-input" />
        </FormField>
        <FormField label="Role" htmlFor="operator_role" required>
          <select
            id="operator_role"
            name="operator_role"
            required
            defaultValue={o.operator_role}
            className="ui-select"
          >
            <option value="driver">Driver</option>
            <option value="operator">Operator</option>
            <option value="lead">Lead</option>
          </select>
        </FormField>
        <FormField label="Hourly cost ($)" htmlFor="hourly_cost">
          <input
            id="hourly_cost"
            name="hourly_cost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={o.hourly_cost ?? ""}
            className="ui-input"
            placeholder="Uses company default if empty"
          />
        </FormField>
        <FormField label="Overtime rate ($)" htmlFor="overtime_rate">
          <input
            id="overtime_rate"
            name="overtime_rate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={o.overtime_rate ?? ""}
            className="ui-input"
            placeholder="Optional override"
          />
        </FormField>
        <FormField label="Shift" htmlFor="shift">
          <select id="shift" name="shift" defaultValue={o.shift ?? ""} className="ui-select">
            <option value="">Standard</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="swing">Swing</option>
          </select>
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input type="hidden" name="is_active" value="off" />
          <input type="checkbox" name="is_active" value="on" defaultChecked={o.is_active} />
          <span>Active</span>
        </label>
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
