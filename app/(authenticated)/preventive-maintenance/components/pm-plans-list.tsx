"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  bulkCreatePlansFromTemplate,
  deletePreventiveMaintenancePlan,
  deletePreventiveMaintenanceTemplate,
  duplicatePreventiveMaintenancePlan,
  generateDuePreventiveMaintenanceRuns,
  generatePreventiveMaintenanceNow,
  savePreventiveMaintenancePlan,
  savePreventiveMaintenanceTemplate,
  updatePreventiveMaintenancePlanStatus,
} from "../actions";
import {
  PreventiveMaintenancePlanFormModal,
  type PreventiveMaintenancePlan,
} from "./pm-plan-form-modal";
import {
  PreventiveMaintenanceTemplateFormModal,
  type PreventiveMaintenanceTemplate,
} from "./pm-template-form-modal";
import { PreventiveMaintenanceBulkTemplateModal } from "./pm-bulk-template-modal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/ui/tooltip";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { Hint } from "@/src/components/ui/hint";
import { PriorityBadge } from "@/src/components/ui/priority-badge";

type CompanyOption = { id: string; name: string };
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

type PMListRow = PreventiveMaintenancePlan & {
  asset_name?: string | null;
  technician_name?: string | null;
};

type FilterParams = {
  q: string;
  frequency: string;
  status: string;
  technician_id: string;
};

type Props = {
  plans: PMListRow[];
  templates: PreventiveMaintenanceTemplate[];
  companies: CompanyOption[];
  assets: AssetOption[];
  technicians: TechnicianOption[];
  filterParams: FilterParams;
  error?: string | null;
  initialPrefill?: { company_id?: string; asset_id?: string } | null;
  autoOpenNew?: boolean;
};

function buildParams(
  searchParams: URLSearchParams,
  updates: Record<string, string>
): string {
  const next = new URLSearchParams(searchParams.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (!value) next.delete(key);
    else next.set(key, value);
  });
  return next.toString();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value + "T12:00:00").toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return "—";
  }
}

function frequencyDisplay(plan: PMListRow): string {
  const interval = Number(plan.frequency_interval ?? 1);
  if (interval === 1) return `Every ${plan.frequency_type}`;
  return `Every ${interval} ${plan.frequency_type}`;
}

export function PreventiveMaintenancePlansList({
  plans,
  templates,
  companies,
  assets,
  technicians,
  filterParams,
  error: initialError,
  initialPrefill = null,
  autoOpenNew = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );
  const [searchLocal, setSearchLocal] = useState(filterParams.q);

  const [planModalOpen, setPlanModalOpen] = useState(autoOpenNew);
  const [editingPlan, setEditingPlan] = useState<PMListRow | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<PreventiveMaintenanceTemplate | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  useEffect(() => {
    if (!autoOpenNew) return;
    if (typeof window !== "undefined" && window.history.replaceState) {
      window.history.replaceState({}, "", pathname ?? "/preventive-maintenance");
    }
  }, [autoOpenNew, pathname]);

  const applyFilters = useCallback(
    (updates: Record<string, string>) => {
      const query = buildParams(searchParams, updates);
      startTransition(() => {
        router.push(`/preventive-maintenance${query ? `?${query}` : ""}`);
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    applyFilters({ q: searchLocal.trim() });
  };

  const handleDeletePlan = (id: string, name: string) => {
    if (!confirm(`Delete PM plan "${name}"?`)) return;
    startTransition(async () => {
      const result = await deletePreventiveMaintenancePlan(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Plan deleted." });
        router.refresh();
      }
    });
  };

  const handleStatusToggle = (plan: PMListRow) => {
    const nextStatus = plan.status === "active" ? "paused" : "active";
    startTransition(async () => {
      const result = await updatePreventiveMaintenancePlanStatus(plan.id, nextStatus);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({
          type: "success",
          text: `Plan ${nextStatus === "active" ? "resumed" : "paused"}.`,
        });
        router.refresh();
      }
    });
  };

  const handleArchive = (planId: string) => {
    startTransition(async () => {
      const result = await updatePreventiveMaintenancePlanStatus(planId, "archived");
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Plan archived." });
        router.refresh();
      }
    });
  };

  const handleDuplicate = (planId: string) => {
    startTransition(async () => {
      const result = await duplicatePreventiveMaintenancePlan(planId);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Plan duplicated." });
        router.refresh();
      }
    });
  };

  const handleGenerateNow = (planId: string) => {
    startTransition(async () => {
      const result = await generatePreventiveMaintenanceNow(planId);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        const generatedWo = result.generatedWorkOrders ?? 0;
        setMessage({
          type: "success",
          text:
            generatedWo > 0
              ? "PM run generated and work order created."
              : "PM run generated.",
        });
        router.refresh();
      }
    });
  };

  const handleGenerateDue = () => {
    startTransition(async () => {
      const result = await generateDuePreventiveMaintenanceRuns();
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({
          type: "success",
          text: `Generated ${result.generatedRuns ?? 0} runs, ${result.generatedWorkOrders ?? 0} work orders, skipped ${result.skipped ?? 0}, failed ${result.failed ?? 0}.`,
        });
        router.refresh();
      }
    });
  };

  const handleDeleteTemplate = (template: PreventiveMaintenanceTemplate) => {
    if (!confirm(`Delete PM template "${template.name}"?`)) return;
    startTransition(async () => {
      const result = await deletePreventiveMaintenanceTemplate(template.id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Template deleted." });
        router.refresh();
      }
    });
  };

  if (initialError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{initialError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-tour="preventive-maintenance:pm-schedules">
      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-[var(--accent)]/10 text-[var(--accent)]"
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3" data-tour="preventive-maintenance:generated-wo">
        <h2 className="text-lg font-medium text-[var(--foreground)]">Preventive Maintenance</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateDue}
            disabled={isPending}
            className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
          >
            Generate Due Runs
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(null);
              setTemplateModalOpen(true);
            }}
            className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
          >
            New Template
          </button>
          <button
            type="button"
            onClick={() => setBulkModalOpen(true)}
            className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
          >
            Bulk Schedule
          </button>
          <Tooltip placement="bottom">
            <TooltipTrigger>
          <button
            type="button"
            onClick={() => {
              setEditingPlan(null);
              setPlanModalOpen(true);
            }}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            New PM Plan
          </button>
            </TooltipTrigger>
            <TooltipContent>Create recurring plan</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Search
            </label>
            <input
              type="search"
              value={searchLocal}
              onChange={(event) => setSearchLocal(event.target.value)}
              placeholder="Plan name or description..."
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Technician
            </label>
            <select
              value={filterParams.technician_id}
              onChange={(event) => applyFilters({ technician_id: event.target.value })}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <option value="">All</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Frequency
            </label>
            <select
              value={filterParams.frequency}
              onChange={(event) => applyFilters({ frequency: event.target.value })}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <option value="">All</option>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
              <option value="quarterly">quarterly</option>
              <option value="yearly">yearly</option>
            </select>
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Status
            </label>
            <select
              value={filterParams.status}
              onChange={(event) => applyFilters({ status: event.target.value })}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              <option value="">All</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Search
          </button>
          {(filterParams.q ||
            filterParams.frequency ||
            filterParams.status ||
            filterParams.technician_id) && (
            <button
              type="button"
              onClick={() =>
                applyFilters({
                  q: "",
                  frequency: "",
                  status: "",
                  technician_id: "",
                })
              }
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {plans.length === 0 ? (
        <div className="space-y-4">
          {!filterParams.q && !filterParams.frequency && !filterParams.status && !filterParams.technician_id && (
            <Hint
              id="pm-no-plans"
              variant="empty-state"
              message="PM plans define recurring service (e.g. monthly inspection). Create a plan per asset, set frequency, and the system can auto-generate work orders when due."
            />
          )}
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
            <p className="text-[var(--muted)]">No preventive maintenance plans found.</p>
            <button
              type="button"
              onClick={() => {
                setEditingPlan(null);
                setPlanModalOpen(true);
              }}
              className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Create your first PM plan
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm" data-tour="preventive-maintenance:recurrence">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/70 text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Asset</th>
                  <th className="px-4 py-3 font-semibold">Frequency</th>
                  <th className="px-4 py-3 font-semibold">Next Run</th>
                  <th className="px-4 py-3 font-semibold">Technician</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="border-b border-[var(--card-border)] last:border-0 transition-colors hover:bg-[var(--background)]/50"
                  >
                    <td className="px-4 py-3.5 text-[var(--foreground)]">
                      <Link
                        href={`/preventive-maintenance/${plan.id}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {plan.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">
                      {plan.asset_name ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">
                      {frequencyDisplay(plan)}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">
                      {formatDate(plan.next_run_date)}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">
                      {plan.technician_name ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/preventive-maintenance/${plan.id}`}
                          className="rounded text-[var(--accent)] hover:underline"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlan(plan);
                            setPlanModalOpen(true);
                          }}
                          className="rounded text-[var(--accent)] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(plan)}
                          disabled={isPending || plan.status === "archived"}
                          className="rounded text-[var(--accent)] hover:underline disabled:opacity-50"
                        >
                          {plan.status === "active" ? "Pause" : "Resume"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateNow(plan.id)}
                          disabled={isPending}
                          className="rounded text-[var(--accent)] hover:underline disabled:opacity-50"
                        >
                          Generate Now
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(plan.id)}
                          disabled={isPending}
                          className="rounded text-[var(--accent)] hover:underline disabled:opacity-50"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(plan.id)}
                          disabled={isPending || plan.status === "archived"}
                          className="rounded text-[var(--muted)] hover:underline disabled:opacity-50"
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id, plan.name)}
                          disabled={isPending}
                          className="rounded text-red-500 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">PM Templates</h3>
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(null);
              setTemplateModalOpen(true);
            }}
            className="rounded text-sm text-[var(--accent)] hover:underline"
          >
            Create Template
          </button>
        </div>
        {templates.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No templates yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/40 text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-2 py-2 font-semibold">Template</th>
                  <th className="px-2 py-2 font-semibold">Frequency</th>
                  <th className="px-2 py-2 font-semibold">Priority</th>
                  <th className="px-2 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b border-[var(--card-border)] last:border-0 transition-colors hover:bg-[var(--background)]/40">
                    <td className="px-2 py-2 text-[var(--foreground)]">{template.name}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">
                      Every {template.frequency_interval} {template.frequency_type}
                    </td>
                    <td className="px-2 py-2 text-[var(--muted)]">
                      <PriorityBadge priority={template.priority} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplate(template);
                            setTemplateModalOpen(true);
                          }}
                          className="rounded text-[var(--accent)] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(template)}
                          disabled={isPending}
                          className="rounded text-red-500 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {planModalOpen && (
        <PreventiveMaintenancePlanFormModal
          open={planModalOpen}
          onClose={() => {
            setPlanModalOpen(false);
            setEditingPlan(null);
            router.refresh();
          }}
          plan={editingPlan}
          prefill={editingPlan ? null : initialPrefill}
          companies={companies}
          assets={assets}
          technicians={technicians}
          templates={templates}
          saveAction={savePreventiveMaintenancePlan}
        />
      )}

      {templateModalOpen && (
        <PreventiveMaintenanceTemplateFormModal
          open={templateModalOpen}
          onClose={() => {
            setTemplateModalOpen(false);
            setEditingTemplate(null);
            router.refresh();
          }}
          template={editingTemplate}
          companies={companies}
          saveAction={savePreventiveMaintenanceTemplate}
        />
      )}

      {bulkModalOpen && (
        <PreventiveMaintenanceBulkTemplateModal
          open={bulkModalOpen}
          onClose={() => {
            setBulkModalOpen(false);
            router.refresh();
          }}
          companies={companies}
          templates={templates}
          assets={assets}
          technicians={technicians}
          saveAction={bulkCreatePlansFromTemplate}
        />
      )}
    </div>
  );
}
