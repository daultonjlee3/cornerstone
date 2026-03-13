"use client";

import { useActionState, useEffect } from "react";

export type Technician = {
  id: string;
  technician_name: string | null;
  name?: string;
  company_id: string;
  user_id?: string | null;
  is_portal_only?: boolean;
  email: string | null;
  phone: string | null;
  trade: string | null;
  status: string;
  hourly_cost: number | null;
  notes: string | null;
};

type CompanyOption = { id: string; name: string };

type TechnicianFormModalProps = {
  open: boolean;
  onClose: () => void;
  technician: Technician | null;
  companies: CompanyOption[];
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

const emptyTechnician: Technician = {
  id: "",
  technician_name: "",
  company_id: "",
  user_id: null,
  is_portal_only: false,
  email: null,
  phone: null,
  trade: null,
  status: "active",
  hourly_cost: null,
  notes: null,
};

export function TechnicianFormModal({
  open,
  onClose,
  technician,
  companies,
  saveAction,
}: TechnicianFormModalProps) {
  const isEdit = !!technician?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  if (!open) return null;

  const t = technician ?? emptyTechnician;
  const displayName = t.technician_name ?? t.name ?? "";
  const hasLinkedUser = Boolean(t.user_id);
  const hourlyDisplay =
    t.hourly_cost != null && t.hourly_cost !== undefined
      ? String(t.hourly_cost)
      : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="sticky top-0 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit Technician" : "New Technician"}
          </h2>
        </div>
        <form action={formAction} className="space-y-4 p-6">
          {isEdit && <input type="hidden" name="id" value={t.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="technician_name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Technician name *
            </label>
            <input
              id="technician_name"
              name="technician_name"
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
              defaultValue={t.company_id}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={t.email ?? ""}
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
                type="text"
                defaultValue={t.phone ?? ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="trade" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Trade
              </label>
              <input
                id="trade"
                name="trade"
                type="text"
                defaultValue={t.trade ?? ""}
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
                defaultValue={t.status}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {!isEdit ? (
            <label className="flex items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/70 px-3 py-2 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                name="create_login"
                value="1"
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block font-medium">Create login for this technician</span>
                <span className="block text-xs text-[var(--muted)]">
                  Requires email. New logins are technician portal only; existing org users keep main app access.
                </span>
              </span>
            </label>
          ) : hasLinkedUser ? (
            <label className="flex items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/70 px-3 py-2 text-sm text-[var(--foreground)]">
              <input type="hidden" name="portal_login_enabled_present" value="1" />
              <input
                type="checkbox"
                name="portal_login_enabled"
                value="1"
                defaultChecked={Boolean(t.is_portal_only)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block font-medium">Portal login enabled</span>
                <span className="block text-xs text-[var(--muted)]">
                  Disable to revoke technician portal-only access for linked user.
                </span>
              </span>
            </label>
          ) : (
            <label className="flex items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/70 px-3 py-2 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                name="create_login"
                value="1"
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block font-medium">Create login for this technician</span>
                <span className="block text-xs text-[var(--muted)]">
                  This technician currently has no linked login user.
                </span>
              </span>
            </label>
          )}
          <div>
            <label htmlFor="hourly_cost" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Hourly cost
            </label>
            <input
              id="hourly_cost"
              name="hourly_cost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={hourlyDisplay}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={t.notes ?? ""}
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
