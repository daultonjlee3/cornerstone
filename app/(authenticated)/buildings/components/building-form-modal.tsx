"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";

export type Building = {
  id: string;
  building_name: string | null;
  name?: string;
  property_id: string;
  building_code: string | null;
  status: string;
  year_built: number | null;
  floors: number | null;
  square_feet: number | null;
  notes: string | null;
  property?: { name: string; company_id?: string } | { property_name: string; company_id?: string } | null;
};

type PropertyOption = { id: string; name: string };

type BuildingFormModalProps = {
  open: boolean;
  onClose: () => void;
  building: Building | null;
  properties: PropertyOption[];
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

const emptyBuilding: Building = {
  id: "",
  building_name: "",
  property_id: "",
  building_code: null,
  status: "active",
  year_built: null,
  floors: null,
  square_feet: null,
  notes: null,
};

export function BuildingFormModal({
  open,
  onClose,
  building,
  properties,
  saveAction,
}: BuildingFormModalProps) {
  const isEdit = !!building?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const b = building ?? emptyBuilding;
  const displayName = b.building_name ?? b.name ?? "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Building" : "New Building"}
      className="max-w-md"
    >
      <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={b.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <FormField label="Building name" htmlFor="building_name" required>
            <input
              id="building_name"
              name="building_name"
              type="text"
              required
              defaultValue={displayName}
              className="ui-input"
            />
          </FormField>
          <FormField label="Property" htmlFor="property_id" required>
            <select
              id="property_id"
              name="property_id"
              required
              defaultValue={b.property_id}
              className="ui-select"
            >
              <option value="">Select property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Building code" htmlFor="building_code">
            <input
              id="building_code"
              name="building_code"
              type="text"
              defaultValue={b.building_code ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={b.status}
              className="ui-select"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Year built" htmlFor="year_built">
              <input
                id="year_built"
                name="year_built"
                type="number"
                min={1800}
                max={2100}
                defaultValue={b.year_built ?? ""}
                className="ui-input"
              />
            </FormField>
            <FormField label="Floors" htmlFor="floors">
              <input
                id="floors"
                name="floors"
                type="number"
                min={0}
                defaultValue={b.floors ?? ""}
                className="ui-input"
              />
            </FormField>
          </div>
          <FormField label="Square feet" htmlFor="square_feet">
            <input
              id="square_feet"
              name="square_feet"
              type="number"
              min={0}
              step="any"
              defaultValue={b.square_feet ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Notes" htmlFor="notes">
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={b.notes ?? ""}
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
