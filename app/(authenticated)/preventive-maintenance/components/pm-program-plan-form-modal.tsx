"use client";

import { useActionState, useEffect } from "react";

type CompanyOption = { id: string; name: string };
type PMProgramPlan = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: string | null;
  active: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  companies: CompanyOption[];
  plan: PMProgramPlan | null;
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

const inputClass =
  "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

export function PMProgramPlanFormModal({
  open,
  onClose,
  companies,
  plan,
  saveAction,
}: Props) {
  const [state, formAction, isPending] = useActionState(saveAction, {});
  const isEdit = !!plan?.id;

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="border-b border-[var(--card-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit PM Plan" : "New PM Plan"}
          </h2>
        </div>
        <form action={formAction} className="space-y-4 p-6">
          {isEdit ? <input type="hidden" name="id" value={plan.id} /> : null}
          {state?.error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Company *</label>
            <select
              name="company_id"
              defaultValue={plan?.company_id ?? (companies.length === 1 ? companies[0].id : "")}
              required
              className={inputClass}
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Plan name *</label>
            <input name="name" required defaultValue={plan?.name ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Category</label>
            <input name="category" defaultValue={plan?.category ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Description</label>
            <textarea name="description" rows={3} defaultValue={plan?.description ?? ""} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              name="active"
              defaultChecked={plan?.active ?? true}
              className="rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            Active
          </label>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isPending ? "Saving…" : isEdit ? "Save PM Plan" : "Create PM Plan"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-[var(--foreground)] hover:bg-[var(--card-border)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
