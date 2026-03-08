"use client";

import { useActionState, useEffect } from "react";

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

  if (!open) return null;

  const p = property ?? emptyProperty;
  const displayName = p.property_name ?? (p as { name?: string }).name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="sticky top-0 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit Property" : "New Property"}
          </h2>
        </div>
        <form action={formAction} className="space-y-4 p-6">
          {isEdit && <input type="hidden" name="id" value={p.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="property_name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Property name *
            </label>
            <input
              id="property_name"
              name="property_name"
              type="text"
              required
              defaultValue={displayName}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="company_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Company *
            </label>
            <select
              id="company_id"
              name="company_id"
              required
              defaultValue={p.company_id}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="address_line1" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Address line 1
            </label>
            <input
              id="address_line1"
              name="address_line1"
              type="text"
              defaultValue={p.address_line1 ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="address_line2" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Address line 2
            </label>
            <input
              id="address_line2"
              name="address_line2"
              type="text"
              defaultValue={p.address_line2 ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={p.city ?? ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label htmlFor="state" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                defaultValue={p.state ?? ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
          </div>
          <div>
            <label htmlFor="zip" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Zip
            </label>
            <input
              id="zip"
              name="zip"
              type="text"
              defaultValue={p.zip ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={p.status}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {isPending ? "Saving…" : isEdit ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-[var(--foreground)] hover:bg-[var(--card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
