"use client";

import { useActionState, useEffect } from "react";

export type PreventiveMaintenanceTemplate = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  frequency_type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  frequency_interval: number;
  priority: string;
  estimated_duration_minutes: number | null;
  instructions: string | null;
};

type CompanyOption = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  template: PreventiveMaintenanceTemplate | null;
  companies: CompanyOption[];
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

const FREQUENCY_OPTIONS = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent", "emergency"] as const;
const inputClass =
  "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

export function PreventiveMaintenanceTemplateFormModal({
  open,
  onClose,
  template,
  companies,
  saveAction,
}: Props) {
  const isEdit = !!template?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

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
            {isEdit ? "Edit PM Template" : "New PM Template"}
          </h2>
        </div>
        <form action={formAction} className="space-y-4 p-6">
          {isEdit && <input type="hidden" name="id" value={template!.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Company *
            </label>
            <select
              name="company_id"
              required
              defaultValue={template?.company_id ?? ""}
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
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Template name *
            </label>
            <input
              name="name"
              required
              defaultValue={template?.name ?? ""}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              defaultValue={template?.description ?? ""}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Frequency *
              </label>
              <select
                name="frequency_type"
                required
                defaultValue={template?.frequency_type ?? "monthly"}
                className={inputClass}
              >
                {FREQUENCY_OPTIONS.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Interval *
              </label>
              <input
                name="frequency_interval"
                type="number"
                min={1}
                required
                defaultValue={template?.frequency_interval ?? 1}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Priority
              </label>
              <select
                name="priority"
                defaultValue={template?.priority ?? "medium"}
                className={inputClass}
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Estimated duration (min)
            </label>
            <input
              name="estimated_duration_minutes"
              type="number"
              min={1}
              defaultValue={template?.estimated_duration_minutes ?? ""}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Instructions
            </label>
            <textarea
              name="instructions"
              rows={3}
              defaultValue={template?.instructions ?? ""}
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isPending ? "Saving…" : isEdit ? "Save Template" : "Create Template"}
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
