"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";

export type Unit = {
  id: string;
  unit_name: string | null;
  name_or_number?: string;
  building_id: string;
  unit_code: string | null;
  floor: string | null;
  square_feet: number | null;
  square_footage?: number | null;
  occupancy_type: string | null;
  status: string;
  notes: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  building?: { building_name?: string; name?: string } | null;
};

type BuildingOption = { id: string; name: string };

type UnitFormModalProps = {
  open: boolean;
  onClose: () => void;
  unit: Unit | null;
  buildings: BuildingOption[];
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

const emptyUnit: Unit = {
  id: "",
  unit_name: "",
  building_id: "",
  unit_code: null,
  floor: null,
  square_feet: null,
  occupancy_type: null,
  status: "active",
  notes: null,
  address: null,
  latitude: null,
  longitude: null,
};

export function UnitFormModal({
  open,
  onClose,
  unit,
  buildings,
  saveAction,
}: UnitFormModalProps) {
  const isEdit = !!unit?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const u = unit ?? emptyUnit;
  const displayName = u.unit_name ?? u.name_or_number ?? "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Unit" : "New Unit"}
      className="max-w-md"
    >
      <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={u.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <FormField label="Unit name" htmlFor="unit_name" required>
            <input
              id="unit_name"
              name="unit_name"
              type="text"
              required
              defaultValue={displayName}
              className="ui-input"
            />
          </FormField>
          <FormField label="Building" htmlFor="building_id" required>
            <select
              id="building_id"
              name="building_id"
              required
              defaultValue={u.building_id}
              className="ui-select"
            >
              <option value="">Select building</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Address" htmlFor="unit_address">
            <input
              id="unit_address"
              name="address"
              type="text"
              defaultValue={u.address ?? ""}
              placeholder="Suite, floor, or unit address"
              className="ui-input"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Latitude" htmlFor="unit_latitude">
              <input
                id="unit_latitude"
                name="latitude"
                type="number"
                step="any"
                defaultValue={u.latitude ?? ""}
                placeholder="e.g. 33.7490"
                className="ui-input"
              />
            </FormField>
            <FormField label="Longitude" htmlFor="unit_longitude">
              <input
                id="unit_longitude"
                name="longitude"
                type="number"
                step="any"
                defaultValue={u.longitude ?? ""}
                placeholder="e.g. -84.3880"
                className="ui-input"
              />
            </FormField>
          </div>
          <FormField label="Unit code" htmlFor="unit_code">
            <input
              id="unit_code"
              name="unit_code"
              type="text"
              defaultValue={u.unit_code ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Floor" htmlFor="floor">
            <input
              id="floor"
              name="floor"
              type="text"
              defaultValue={u.floor ?? ""}
              placeholder="e.g. 2 or 2nd"
              className="ui-input"
            />
          </FormField>
          <FormField label="Square feet" htmlFor="square_feet">
            <input
              id="square_feet"
              name="square_feet"
              type="number"
              min={0}
              step="any"
              defaultValue={u.square_feet ?? u.square_footage ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Occupancy type" htmlFor="occupancy_type">
            <input
              id="occupancy_type"
              name="occupancy_type"
              type="text"
              defaultValue={u.occupancy_type ?? ""}
              placeholder="e.g. Office, Retail"
              className="ui-input"
            />
          </FormField>
          <FormField label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={u.status}
              className="ui-select"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
          <FormField label="Notes" htmlFor="notes">
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={u.notes ?? ""}
              className="ui-textarea"
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
