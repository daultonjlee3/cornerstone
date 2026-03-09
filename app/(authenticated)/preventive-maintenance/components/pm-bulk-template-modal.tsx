"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { PreventiveMaintenanceTemplate } from "./pm-template-form-modal";
import { formatDateOnly } from "@/src/lib/preventive-maintenance/schedule";

type CompanyOption = { id: string; name: string };
type AssetOption = {
  id: string;
  name: string;
  company_id: string;
  property_name?: string | null;
  building_name?: string | null;
  unit_name?: string | null;
};
type TechnicianOption = { id: string; name: string; company_id: string };

type Props = {
  open: boolean;
  onClose: () => void;
  companies: CompanyOption[];
  templates: PreventiveMaintenanceTemplate[];
  assets: AssetOption[];
  technicians: TechnicianOption[];
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

const inputClass =
  "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

export function PreventiveMaintenanceBulkTemplateModal({
  open,
  onClose,
  companies,
  templates,
  assets,
  technicians,
  saveAction,
}: Props) {
  const [state, formAction, isPending] = useActionState(saveAction, {});
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const templatesForCompany = useMemo(
    () =>
      companyId
        ? templates.filter((template) => template.company_id === companyId)
        : templates,
    [templates, companyId]
  );
  const assetsForCompany = useMemo(
    () =>
      companyId
        ? assets.filter((asset) => asset.company_id === companyId)
        : assets,
    [assets, companyId]
  );
  const techniciansForCompany = useMemo(
    () =>
      companyId
        ? technicians.filter((technician) => technician.company_id === companyId)
        : technicians,
    [technicians, companyId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="sticky top-0 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Bulk Schedule PM Plans
          </h2>
        </div>
        <form action={formAction} className="space-y-4 p-6">
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
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
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
              Template *
            </label>
            <select name="template_id" required className={inputClass}>
              <option value="">Select template</option>
              {templatesForCompany.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Start date *
              </label>
              <input
                name="start_date"
                type="date"
                required
                defaultValue={formatDateOnly(new Date())}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Default technician
              </label>
              <select name="assigned_technician_id" className={inputClass}>
                <option value="">Unassigned</option>
                {techniciansForCompany.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Assets * (multi-select)
            </label>
            <select
              name="asset_ids"
              multiple
              required
              className={`${inputClass} min-h-44`}
            >
              {assetsForCompany.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                  {[
                    asset.property_name,
                    asset.building_name,
                    asset.unit_name,
                  ]
                    .filter(Boolean)
                    .join(" / ")
                    ? ` — ${[
                        asset.property_name,
                        asset.building_name,
                        asset.unit_name,
                      ]
                        .filter(Boolean)
                        .join(" / ")}`
                    : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Hold Ctrl/Cmd to select multiple assets.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create Plans"}
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
