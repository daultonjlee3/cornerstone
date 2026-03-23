"use client";

import { useActionState, useEffect, useState } from "react";

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
  tasks?: {
    id?: string;
    title: string;
    description?: string | null;
    asset_id?: string | null;
    asset_group?: string | null;
    sort_order?: number;
  }[];
};

type CompanyOption = { id: string; name: string };
type AssetOption = { id: string; name: string; company_id: string };

type Props = {
  open: boolean;
  onClose: () => void;
  template: PreventiveMaintenanceTemplate | null;
  companies: CompanyOption[];
  assets: AssetOption[];
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
  assets,
  saveAction,
}: Props) {
  const isEdit = !!template?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});
  const [tasks, setTasks] = useState<
    { id?: string; title: string; description: string; asset_id: string; asset_group: string; sort_order: number }[]
  >(template?.tasks?.length
    ? template.tasks.map((task, index) => ({
        id: task.id,
        title: task.title,
        description: task.description ?? "",
        asset_id: task.asset_id ?? "",
        asset_group: task.asset_group ?? "",
        sort_order: task.sort_order ?? index,
      }))
    : [{ title: "", description: "", asset_id: "", asset_group: "", sort_order: 0 }]);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  useEffect(() => {
    if (!open) return;
    setTasks(
      template?.tasks?.length
        ? template.tasks.map((task, index) => ({
            id: task.id,
            title: task.title,
            description: task.description ?? "",
            asset_id: task.asset_id ?? "",
            asset_group: task.asset_group ?? "",
            sort_order: task.sort_order ?? index,
          }))
        : [{ title: "", description: "", asset_id: "", asset_group: "", sort_order: 0 }]
    );
  }, [template, open]);

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
              defaultValue={template?.company_id ?? (companies.length === 1 ? companies[0].id : "")}
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

          <div className="space-y-3 rounded-lg border border-[var(--card-border)] p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Tasks</h3>
              <button
                type="button"
                onClick={() =>
                  setTasks((prev) => [
                    ...prev,
                    { title: "", description: "", asset_id: "", asset_group: "", sort_order: prev.length },
                  ])
                }
                className="rounded border border-[var(--card-border)] px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--background)]"
              >
                Add Task
              </button>
            </div>
            {tasks.map((task, index) => (
              <div key={task.id ?? `task-${index}`} className="rounded-lg border border-[var(--card-border)] p-3">
                {task.id ? <input type="hidden" name="task_id" value={task.id} /> : null}
                <input type="hidden" name="task_sort_order" value={String(index)} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Task title *</label>
                    <input
                      name="task_title"
                      required
                      value={task.title}
                      onChange={(event) =>
                        setTasks((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, title: event.target.value } : row
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Task description</label>
                    <textarea
                      name="task_description"
                      rows={2}
                      value={task.description}
                      onChange={(event) =>
                        setTasks((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, description: event.target.value } : row
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Asset (optional)</label>
                    <select
                      name="task_asset_id"
                      value={task.asset_id}
                      onChange={(event) =>
                        setTasks((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, asset_id: event.target.value } : row
                          )
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">None</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Asset group (optional)</label>
                    <input
                      name="task_asset_group"
                      value={task.asset_group}
                      onChange={(event) =>
                        setTasks((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, asset_group: event.target.value } : row
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      setTasks((prev) =>
                        prev.length <= 1
                          ? prev
                          : prev.filter((_, rowIndex) => rowIndex !== index)
                      )
                    }
                    className="text-xs text-red-600 hover:underline"
                    disabled={tasks.length <= 1}
                  >
                    Remove task
                  </button>
                </div>
              </div>
            ))}
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
