"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";

export type CustomerSite = {
  id: string;
  company_id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  customer_id: string | null;
};

type CompanyOption = { id: string; name: string };

type SiteFormModalProps = {
  open: boolean;
  onClose: () => void;
  site: CustomerSite | null;
  companies: CompanyOption[];
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

const emptySite: CustomerSite = {
  id: "",
  company_id: "",
  name: "",
  address_line1: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  latitude: null,
  longitude: null,
  customer_id: null,
};

export function SiteFormModal({
  open,
  onClose,
  site,
  companies,
  saveAction,
}: SiteFormModalProps) {
  const isEdit = !!site?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const s = site ?? emptySite;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Site" : "New Site"}
      className="max-w-md"
    >
      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={s.id} />}
        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        )}
        <FormField label="Company" htmlFor="company_id" required>
          <select
            id="company_id"
            name="company_id"
            required
            defaultValue={s.company_id}
            className="ui-select"
            disabled={isEdit}
          >
            <option value="">Select company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Site name" htmlFor="name" required>
          <input id="name" name="name" type="text" required defaultValue={s.name} className="ui-input" />
        </FormField>
        <FormField label="Address" htmlFor="address_line1">
          <input
            id="address_line1"
            name="address_line1"
            type="text"
            defaultValue={s.address_line1 ?? ""}
            className="ui-input"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="City" htmlFor="city">
            <input id="city" name="city" type="text" defaultValue={s.city ?? ""} className="ui-input" />
          </FormField>
          <FormField label="State" htmlFor="state">
            <input id="state" name="state" type="text" defaultValue={s.state ?? ""} className="ui-input" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Postal code" htmlFor="postal_code">
            <input
              id="postal_code"
              name="postal_code"
              type="text"
              defaultValue={s.postal_code ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Country" htmlFor="country">
            <input id="country" name="country" type="text" defaultValue={s.country ?? ""} className="ui-input" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Latitude" htmlFor="latitude">
            <input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              defaultValue={s.latitude ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Longitude" htmlFor="longitude">
            <input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              defaultValue={s.longitude ?? ""}
              className="ui-input"
            />
          </FormField>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Coordinates are required. Leave blank to geocode from the address on save.
        </p>
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
