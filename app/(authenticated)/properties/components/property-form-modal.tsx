"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";

export type Property = {
  id: string;
  property_name: string | null;
  company_id: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string;
  company?: { name: string } | null;
};

type CompanyOption = { id: string; name: string };

type PropertyFormModalProps = {
  open: boolean;
  onClose: () => void;
  property: Property | null;
  companies: CompanyOption[];
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

const emptyProperty: Property = {
  id: "",
  property_name: "",
  company_id: "",
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  zip: null,
  status: "active",
};

export function PropertyFormModal({
  open,
  onClose,
  property,
  companies,
  saveAction,
}: PropertyFormModalProps) {
  const isEdit = !!property?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const p = property ?? emptyProperty;
  const displayName = p.property_name ?? (p as { name?: string }).name ?? "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Property" : "New Property"}
      className="max-w-md"
    >
      <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={p.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <FormField label="Property name" htmlFor="property_name" required>
            <input
              id="property_name"
              name="property_name"
              type="text"
              required
              defaultValue={displayName}
              className="ui-input"
            />
          </FormField>
          <FormField label="Company" htmlFor="company_id" required>
            <select
              id="company_id"
              name="company_id"
              required
              defaultValue={p.company_id}
              className="ui-select"
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Address line 1" htmlFor="address_line1">
            <input
              id="address_line1"
              name="address_line1"
              type="text"
              defaultValue={p.address_line1 ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Address line 2" htmlFor="address_line2">
            <input
              id="address_line2"
              name="address_line2"
              type="text"
              defaultValue={p.address_line2 ?? ""}
              className="ui-input"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="City" htmlFor="city">
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={p.city ?? ""}
                className="ui-input"
              />
            </FormField>
            <FormField label="State" htmlFor="state">
              <input
                id="state"
                name="state"
                type="text"
                defaultValue={p.state ?? ""}
                className="ui-input"
              />
            </FormField>
          </div>
          <FormField label="Zip" htmlFor="zip">
            <input
              id="zip"
              name="zip"
              type="text"
              defaultValue={p.zip ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={p.status}
              className="ui-select"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
