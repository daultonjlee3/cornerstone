"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";
import type { VendorFormState } from "../actions";

export type VendorRecord = {
  id: string;
  company_id: string;
  name: string;
  service_type: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  preferred_vendor: boolean;
  created_at: string;
  updated_at: string;
  jobs_completed?: number;
  average_response_time_minutes?: number | null;
  total_vendor_cost?: number;
  company_name?: string;
};

type CompanyOption = { id: string; name: string };

type VendorFormModalProps = {
  open: boolean;
  onClose: () => void;
  vendor: VendorRecord | null;
  companies: CompanyOption[];
  saveAction: (prev: VendorFormState, formData: FormData) => Promise<VendorFormState>;
};

const emptyVendor: VendorRecord = {
  id: "",
  company_id: "",
  name: "",
  service_type: null,
  contact_name: null,
  email: null,
  phone: null,
  address: null,
  website: null,
  notes: null,
  preferred_vendor: false,
  created_at: "",
  updated_at: "",
};

export function VendorFormModal({ open, onClose, vendor, companies, saveAction }: VendorFormModalProps) {
  const [state, formAction, isPending] = useActionState(saveAction, {});
  const isEdit = Boolean(vendor?.id);
  const row = vendor ?? { ...emptyVendor, company_id: companies[0]?.id ?? "" };

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Vendor" : "New Vendor"} className="max-w-xl">
      <form action={formAction} className="space-y-4">
        {isEdit ? <input type="hidden" name="id" value={row.id} /> : null}
        {state?.error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}
        <FormField label="Company" htmlFor="vendor-company" required>
          <select id="vendor-company" name="company_id" defaultValue={row.company_id} required className="ui-select">
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Vendor name" htmlFor="vendor-name" required>
          <input id="vendor-name" name="name" defaultValue={row.name} required className="ui-input" />
        </FormField>
        <FormField label="Service type" htmlFor="vendor-service-type">
          <input
            id="vendor-service-type"
            name="service_type"
            defaultValue={row.service_type ?? ""}
            className="ui-input"
            placeholder="HVAC, Electrical, Plumbing..."
          />
        </FormField>
        <FormField label="Contact name" htmlFor="vendor-contact-name">
          <input id="vendor-contact-name" name="contact_name" defaultValue={row.contact_name ?? ""} className="ui-input" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email" htmlFor="vendor-email">
            <input id="vendor-email" name="email" type="email" defaultValue={row.email ?? ""} className="ui-input" />
          </FormField>
          <FormField label="Phone" htmlFor="vendor-phone">
            <input id="vendor-phone" name="phone" defaultValue={row.phone ?? ""} className="ui-input" />
          </FormField>
        </div>
        <FormField label="Website" htmlFor="vendor-website">
          <input id="vendor-website" name="website" type="url" defaultValue={row.website ?? ""} className="ui-input" />
        </FormField>
        <FormField label="Address" htmlFor="vendor-address">
          <textarea id="vendor-address" name="address" rows={2} defaultValue={row.address ?? ""} className="ui-input" />
        </FormField>
        <FormField label="Notes" htmlFor="vendor-notes">
          <textarea id="vendor-notes" name="notes" rows={3} defaultValue={row.notes ?? ""} className="ui-input" />
        </FormField>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="preferred_vendor" defaultChecked={row.preferred_vendor} />
          <span className="text-sm text-[var(--foreground)]">Mark as preferred vendor</span>
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
