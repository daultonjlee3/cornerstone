"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";

export type Company = {
  id: string;
  name: string;
  legal_name: string | null;
  company_code: string | null;
  status: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  phone: string | null;
  slug?: string | null;
  portal_enabled?: boolean | null;
  allow_public_requests?: boolean | null;
  portal_name?: string | null;
  auto_create_work_orders_from_requests?: boolean | null;
};

type CompanyFormModalProps = {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

const emptyCompany: Company = {
  id: "",
  name: "",
  legal_name: null,
  company_code: null,
  status: "active",
  primary_contact_name: null,
  primary_contact_email: null,
  phone: null,
  slug: null,
  portal_enabled: false,
  allow_public_requests: true,
  portal_name: null,
  auto_create_work_orders_from_requests: true,
};

export function CompanyFormModal({
  open,
  onClose,
  company,
  saveAction,
}: CompanyFormModalProps) {
  const isEdit = !!company?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const c = company ?? emptyCompany;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Company" : "New Company"}
      className="max-w-md"
    >
      <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={c.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <FormField label="Company name" htmlFor="name" required>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={c.name}
              className="ui-input"
            />
          </FormField>
          <FormField label="Legal name" htmlFor="legal_name">
            <input
              id="legal_name"
              name="legal_name"
              type="text"
              defaultValue={c.legal_name ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Company code" htmlFor="company_code">
            <input
              id="company_code"
              name="company_code"
              type="text"
              defaultValue={c.company_code ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={c.status}
              className="ui-select"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
          <FormField label="Primary contact name" htmlFor="primary_contact_name">
            <input
              id="primary_contact_name"
              name="primary_contact_name"
              type="text"
              defaultValue={c.primary_contact_name ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Primary contact email" htmlFor="primary_contact_email">
            <input
              id="primary_contact_email"
              name="primary_contact_email"
              type="email"
              defaultValue={c.primary_contact_email ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={c.phone ?? ""}
              className="ui-input"
            />
          </FormField>
          <div className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              Request portal
            </p>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="portal_enabled"
                  defaultChecked={Boolean(c.portal_enabled)}
                />
                <span>Enable public maintenance request portal for this company</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  name="allow_public_requests"
                  defaultChecked={c.allow_public_requests ?? true}
                />
                <span>Allow new requests from the public portal URL</span>
              </label>
              <FormField label="Portal slug (for /request/[slug])" htmlFor="portal_slug">
                <input
                  id="portal_slug"
                  name="portal_slug"
                  type="text"
                  defaultValue={c.slug ?? ""}
                  className="ui-input"
                  placeholder="e.g. acme-facilities"
                />
              </FormField>
              <FormField label="Portal display name (optional)" htmlFor="portal_name">
                <input
                  id="portal_name"
                  name="portal_name"
                  type="text"
                  defaultValue={c.portal_name ?? ""}
                  className="ui-input"
                  placeholder="e.g. Acme Facilities Maintenance Portal"
                />
              </FormField>
              <p className="mt-1 text-xs text-[var(--muted)]">
                The portal slug must be unique and URL-safe (lowercase letters, numbers, and dashes).
              </p>
              <div className="mt-3 space-y-1 rounded-md bg-[var(--background)]/60 px-3 py-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="auto_create_work_orders_from_requests"
                    defaultChecked={c.auto_create_work_orders_from_requests ?? true}
                    disabled={!c.portal_enabled}
                  />
                  <span>Auto-create work orders from requests</span>
                </label>
                <p className="text-[11px] leading-snug text-[var(--muted)]">
                  When enabled, new requests from the public portal are automatically converted into work
                  orders. When disabled, requests stay in the Requests queue until reviewed.
                </p>
              </div>
            </div>
          </div>
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
