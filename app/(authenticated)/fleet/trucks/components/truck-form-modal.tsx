"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";

export type Truck = {
  id: string;
  branch_id: string;
  unit_number: string;
  truck_type: string;
  capacity_gallons?: number | null;
  status: string;
  telematics_device_id: string | null;
  home_latitude: number | null;
  home_longitude: number | null;
  notes: string | null;
};

type BranchOption = { id: string; name: string };

type TruckFormModalProps = {
  open: boolean;
  onClose: () => void;
  truck: Truck | null;
  branches: BranchOption[];
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

const emptyTruck: Truck = {
  id: "",
  branch_id: "",
  unit_number: "",
  truck_type: "",
  capacity_gallons: null,
  status: "active",
  telematics_device_id: null,
  home_latitude: null,
  home_longitude: null,
  notes: null,
};

export function TruckFormModal({
  open,
  onClose,
  truck,
  branches,
  saveAction,
}: TruckFormModalProps) {
  const isEdit = !!truck?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const t = truck ?? emptyTruck;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Truck" : "New Truck"}
      className="max-w-md"
    >
      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={t.id} />}
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
            defaultValue={t.branch_id}
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
        <FormField label="Unit number" htmlFor="unit_number" required>
          <input
            id="unit_number"
            name="unit_number"
            type="text"
            required
            defaultValue={t.unit_number}
            className="ui-input"
          />
        </FormField>
        <FormField label="Truck type" htmlFor="truck_type" required>
          <input
            id="truck_type"
            name="truck_type"
            type="text"
            required
            defaultValue={t.truck_type}
            className="ui-input"
            placeholder="e.g. vacuum, hydro, combo"
          />
        </FormField>
        <FormField label="Capacity (gallons)" htmlFor="capacity_gallons">
          <input
            id="capacity_gallons"
            name="capacity_gallons"
            type="number"
            step="any"
            min="0"
            defaultValue={t.capacity_gallons ?? ""}
            className="ui-input"
          />
        </FormField>
        <FormField label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={t.status} className="ui-select">
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </FormField>
        <FormField label="Telematics device ID" htmlFor="telematics_device_id">
          <input
            id="telematics_device_id"
            name="telematics_device_id"
            type="text"
            defaultValue={t.telematics_device_id ?? ""}
            className="ui-input"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Home latitude" htmlFor="home_latitude">
            <input
              id="home_latitude"
              name="home_latitude"
              type="number"
              step="any"
              defaultValue={t.home_latitude ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Home longitude" htmlFor="home_longitude">
            <input
              id="home_longitude"
              name="home_longitude"
              type="number"
              step="any"
              defaultValue={t.home_longitude ?? ""}
              className="ui-input"
            />
          </FormField>
        </div>
        <FormField label="Notes" htmlFor="notes">
          <textarea id="notes" name="notes" rows={2} defaultValue={t.notes ?? ""} className="ui-input" />
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
