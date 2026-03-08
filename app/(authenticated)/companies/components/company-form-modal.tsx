"use client";

import { useActionState, useEffect } from "react";

export type Company = {
  id: string;
  name: string;
  legal_name: string | null;
  company_code: string | null;
  status: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  phone: string | null;
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

  if (!open) return null;

  const c = company ?? emptyCompany;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="border-b border-[var(--card-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit Company" : "New Company"}
          </h2>
        </div>
        <form action={formAction} className="p-6 space-y-4">
          {isEdit && <input type="hidden" name="id" value={c.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Company name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={c.name}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="legal_name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Legal name
            </label>
            <input
              id="legal_name"
              name="legal_name"
              type="text"
              defaultValue={c.legal_name ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="company_code" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Company code
            </label>
            <input
              id="company_code"
              name="company_code"
              type="text"
              defaultValue={c.company_code ?? ""}
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
              defaultValue={c.status}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label htmlFor="primary_contact_name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Primary contact name
            </label>
            <input
              id="primary_contact_name"
              name="primary_contact_name"
              type="text"
              defaultValue={c.primary_contact_name ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="primary_contact_email" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Primary contact email
            </label>
            <input
              id="primary_contact_email"
              name="primary_contact_email"
              type="email"
              defaultValue={c.primary_contact_email ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={c.phone ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
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
