"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  calculateNextRunDate,
  formatDateOnly,
  type PreventiveMaintenanceFrequencyType,
} from "@/src/lib/preventive-maintenance/schedule";

export type PreventiveMaintenancePlan = {
  id: string;
  company_id: string;
  pm_plan_id?: string | null;
  asset_id: string | null;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
  name: string;
  description: string | null;
  frequency_type: PreventiveMaintenanceFrequencyType;
  frequency_interval: number;
  start_date: string;
  next_run_date: string;
  last_run_date: string | null;
  auto_create_work_order: boolean;
  generate_parent_work_order?: boolean;
  generate_child_work_orders?: boolean;
  interval_value?: number | null;
  priority: string;
  estimated_duration_minutes: number | null;
  assigned_technician_id: string | null;
  instructions: string | null;
  status: "active" | "paused" | "archived";
  tasks?: {
    id?: string;
    title: string;
    description?: string | null;
    asset_id?: string | null;
    sort_order?: number;
  }[];
};

type CompanyOption = { id: string; name: string };
type PMProgramPlanOption = {
  id: string;
  company_id: string;
  name: string;
  category?: string | null;
  active?: boolean;
};
type AssetOption = {
  id: string;
  name: string;
  company_id: string;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
  property_name?: string | null;
  building_name?: string | null;
  unit_name?: string | null;
};
type TechnicianOption = { id: string; name: string; company_id: string };

type Prefill = {
  company_id?: string;
  asset_id?: string;
} | null;

/** Template fields that can be applied when creating a new plan. */
export type PMPlanTemplateOption = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  frequency_type: PreventiveMaintenanceFrequencyType;
  frequency_interval: number;
  priority: string;
  estimated_duration_minutes: number | null;
  instructions: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  plan: PreventiveMaintenancePlan | null;
  companies: CompanyOption[];
  assets: AssetOption[];
  technicians: TechnicianOption[];
  prefill?: Prefill;
  /** Optional templates to apply when creating a new plan. Filtered by company in UI. */
  templates?: PMPlanTemplateOption[] | null;
  pmPlans?: PMProgramPlanOption[] | null;
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

const FREQUENCY_OPTIONS: PreventiveMaintenanceFrequencyType[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
];

const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent", "emergency"] as const;
const STATUS_OPTIONS = ["active", "paused", "archived"] as const;

const inputClass =
  "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

export function PreventiveMaintenancePlanFormModal({
  open,
  onClose,
  plan,
  companies,
  assets,
  technicians,
  prefill = null,
  templates = null,
  pmPlans = null,
  saveAction,
}: Props) {
  const isEdit = !!plan?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  const [companyId, setCompanyId] = useState(plan?.company_id ?? prefill?.company_id ?? (companies.length === 1 ? companies[0]?.id ?? "" : ""));
  const [assetId, setAssetId] = useState(plan?.asset_id ?? prefill?.asset_id ?? "");
  const [frequencyType, setFrequencyType] = useState<PreventiveMaintenanceFrequencyType>(
    plan?.frequency_type ?? "monthly"
  );
  const [frequencyInterval, setFrequencyInterval] = useState(
    plan?.frequency_interval?.toString() ?? "1"
  );
  const [startDate, setStartDate] = useState(
    plan?.start_date ?? formatDateOnly(new Date())
  );
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [priority, setPriority] = useState(plan?.priority ?? "medium");
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState(
    plan?.estimated_duration_minutes != null ? String(plan.estimated_duration_minutes) : ""
  );
  const [instructions, setInstructions] = useState(plan?.instructions ?? "");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [pmPlanId, setPmPlanId] = useState(plan?.pm_plan_id ?? "");
  const [scheduleTasks, setScheduleTasks] = useState<
    { title: string; description: string; asset_id: string; sort_order: number }[]
  >(
    plan?.tasks?.length
      ? plan.tasks.map((task, index) => ({
          title: task.title,
          description: task.description ?? "",
          asset_id: task.asset_id ?? "",
          sort_order: task.sort_order ?? index,
        }))
      : [{ title: "", description: "", asset_id: "", sort_order: 0 }]
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  useEffect(() => {
    if (open && !plan) {
      setSelectedTemplateId("");
      setName("");
      setDescription("");
      setPriority("medium");
      setEstimatedDurationMinutes("");
      setInstructions("");
      setPmPlanId("");
      setScheduleTasks([{ title: "", description: "", asset_id: "", sort_order: 0 }]);
    }
    if (open && plan) {
      setPmPlanId(plan.pm_plan_id ?? "");
      setScheduleTasks(
        plan.tasks?.length
          ? plan.tasks.map((task, index) => ({
              title: task.title,
              description: task.description ?? "",
              asset_id: task.asset_id ?? "",
              sort_order: task.sort_order ?? index,
            }))
          : [{ title: "", description: "", asset_id: "", sort_order: 0 }]
      );
    }
  }, [open, plan]);

  const templatesForCompany = useMemo(
    () =>
      companyId && templates?.length
        ? templates.filter((t) => t.company_id === companyId)
        : templates ?? [],
    [templates, companyId]
  );
  const pmPlansForCompany = useMemo(
    () =>
      companyId && pmPlans?.length
        ? pmPlans.filter((row) => row.company_id === companyId)
        : pmPlans ?? [],
    [pmPlans, companyId]
  );

  const applyTemplate = (template: PMPlanTemplateOption) => {
    setName(template.name);
    setDescription(template.description ?? "");
    setFrequencyType(template.frequency_type);
    setFrequencyInterval(String(template.frequency_interval));
    setPriority(template.priority);
    setEstimatedDurationMinutes(
      template.estimated_duration_minutes != null
        ? String(template.estimated_duration_minutes)
        : ""
    );
    setInstructions(template.instructions ?? "");
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = (templates ?? []).find((t) => t.id === templateId);
    if (template) applyTemplate(template);
  };

  const assetsForCompany = useMemo(
    () => (companyId ? assets.filter((asset) => asset.company_id === companyId) : []),
    [assets, companyId]
  );
  const techniciansForCompany = useMemo(
    () =>
      companyId
        ? technicians.filter((technician) => technician.company_id === companyId)
        : technicians,
    [companyId, technicians]
  );

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId) ?? null,
    [assets, assetId]
  );

  const nextRunPreview = useMemo(() => {
    if (!startDate) return "—";
    try {
      return calculateNextRunDate({
        frequencyType,
        frequencyInterval: parseInt(frequencyInterval, 10) || 1,
        baseDate: startDate,
      });
    } catch {
      return "—";
    }
  }, [startDate, frequencyType, frequencyInterval]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit PM Plan" : "New PM Plan"}
          </h2>
        </div>
        <form action={formAction} className="space-y-4 p-6">
          {isEdit && <input type="hidden" name="id" value={plan!.id} />}
          {state?.error && (
            <p
              className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {state.error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Company *
              </label>
              <select
                name="company_id"
                required
                value={companyId}
                onChange={(event) => {
                  setCompanyId(event.target.value);
                  setAssetId("");
                }}
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
                PM Plan
              </label>
              <select
                name="pm_plan_id"
                value={pmPlanId}
                onChange={(event) => setPmPlanId(event.target.value)}
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {pmPlansForCompany.map((pmPlan) => (
                  <option key={pmPlan.id} value={pmPlan.id}>
                    {pmPlan.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Asset
              </label>
              <select
                name="asset_id"
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
                className={inputClass}
              >
                <option value="">None</option>
                {assetsForCompany.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <input
            type="hidden"
            name="property_id"
            value={selectedAsset?.property_id ?? plan?.property_id ?? ""}
          />
          <input
            type="hidden"
            name="building_id"
            value={selectedAsset?.building_id ?? plan?.building_id ?? ""}
          />
          <input
            type="hidden"
            name="unit_id"
            value={selectedAsset?.unit_id ?? plan?.unit_id ?? ""}
          />

          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)]">
            <p>
              Location:{" "}
              {[
                selectedAsset?.property_name ?? null,
                selectedAsset?.building_name ?? null,
                selectedAsset?.unit_name ?? null,
              ]
                .filter(Boolean)
                .join(" / ") || "—"}
            </p>
          </div>

          {!isEdit && templatesForCompany.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Apply template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className={inputClass}
                aria-label="Apply a template to prefill this plan"
              >
                <option value="">None — create from scratch</option>
                {templatesForCompany.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Selecting a template fills name, frequency, priority, duration, and instructions.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Plan name *
            </label>
            <input
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                value={frequencyType}
                onChange={(event) =>
                  setFrequencyType(event.target.value as PreventiveMaintenanceFrequencyType)
                }
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
                value={frequencyInterval}
                onChange={(event) => setFrequencyInterval(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Interval value
              </label>
              <input
                name="interval_value"
                type="number"
                min={1}
                defaultValue={plan?.interval_value ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Start date *
              </label>
              <input
                name="start_date"
                type="date"
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--foreground)]">
            Next run preview: <span className="font-medium">{nextRunPreview}</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Technician
              </label>
              <select
                name="assigned_technician_id"
                defaultValue={plan?.assigned_technician_id ?? ""}
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {techniciansForCompany.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Priority
              </label>
              <select
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={inputClass}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Estimated duration (min)
              </label>
              <input
                name="estimated_duration_minutes"
                type="number"
                min={1}
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              name="auto_create_work_order"
              defaultChecked={plan?.auto_create_work_order ?? true}
              className="rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            Automatically create work order when due
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              name="generate_parent_work_order"
              defaultChecked={plan?.generate_parent_work_order ?? true}
              className="rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            Generate parent work order
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              name="generate_child_work_orders"
              defaultChecked={plan?.generate_child_work_orders ?? false}
              className="rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            Generate child work orders from schedule tasks
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Instructions
            </label>
            <textarea
              name="instructions"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-[var(--card-border)] p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Schedule Tasks</h3>
              <button
                type="button"
                onClick={() =>
                  setScheduleTasks((prev) => [
                    ...prev,
                    { title: "", description: "", asset_id: "", sort_order: prev.length },
                  ])
                }
                className="rounded border border-[var(--card-border)] px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--background)]"
              >
                Add Task
              </button>
            </div>
            {scheduleTasks.map((task, index) => (
              <div key={`schedule-task-${index}`} className="rounded-lg border border-[var(--card-border)] p-3">
                <input type="hidden" name="task_sort_order" value={String(index)} />
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                      Task title
                    </label>
                    <input
                      name="task_title"
                      value={task.title}
                      onChange={(event) =>
                        setScheduleTasks((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, title: event.target.value } : row
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                      Description
                    </label>
                    <textarea
                      name="task_description"
                      rows={2}
                      value={task.description}
                      onChange={(event) =>
                        setScheduleTasks((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, description: event.target.value }
                              : row
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                      Asset (optional)
                    </label>
                    <select
                      name="task_asset_id"
                      value={task.asset_id}
                      onChange={(event) =>
                        setScheduleTasks((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, asset_id: event.target.value } : row
                          )
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">None</option>
                      {assetsForCompany.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Status
            </label>
            <select
              name="status"
              defaultValue={plan?.status ?? "active"}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isPending ? "Saving…" : isEdit ? "Save Plan" : "Create Plan"}
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
