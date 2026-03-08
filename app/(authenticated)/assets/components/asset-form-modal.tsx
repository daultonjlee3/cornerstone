"use client";

import { useActionState, useEffect } from "react";

export type Asset = {
  id: string;
  asset_name: string | null;
  name?: string;
  company_id: string;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
  asset_tag: string | null;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  install_date: string | null;
  status: string;
  notes: string | null;
};

type CompanyOption = { id: string; name: string };
type PropertyOption = { id: string; name: string };
type BuildingOption = { id: string; name: string };
type UnitOption = { id: string; name: string };

type AssetFormModalProps = {
  open: boolean;
  onClose: () => void;
  asset: Asset | null;
  companies: CompanyOption[];
  properties: PropertyOption[];
  buildings: BuildingOption[];
  units: UnitOption[];
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

const emptyAsset: Asset = {
  id: "",
  asset_name: "",
  company_id: "",
  property_id: null,
  building_id: null,
  unit_id: null,
  asset_tag: null,
  category: null,
  manufacturer: null,
  model: null,
  serial_number: null,
  install_date: null,
  status: "active",
  notes: null,
};

export function AssetFormModal({
  open,
  onClose,
  asset,
  companies,
  properties,
  buildings,
  units,
  saveAction,
}: AssetFormModalProps) {
  const isEdit = !!asset?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  if (!open) return null;

  const a = asset ?? emptyAsset;
  const displayName = a.asset_name ?? a.name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="sticky top-0 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit Asset" : "New Asset"}
          </h2>
        </div>
        <form action={formAction} className="space-y-4 p-6">
          {isEdit && <input type="hidden" name="id" value={a.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="asset_name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Asset name *
            </label>
            <input
              id="asset_name"
              name="asset_name"
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
              defaultValue={a.company_id}
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
            <label htmlFor="property_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Property
            </label>
            <select
              id="property_id"
              name="property_id"
              defaultValue={a.property_id ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">None</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="building_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Building
            </label>
            <select
              id="building_id"
              name="building_id"
              defaultValue={a.building_id ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">None</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="unit_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Unit
            </label>
            <select
              id="unit_id"
              name="unit_id"
              defaultValue={a.unit_id ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">None</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="asset_tag" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Asset tag
            </label>
            <input
              id="asset_tag"
              name="asset_tag"
              type="text"
              defaultValue={a.asset_tag ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Category
            </label>
            <input
              id="category"
              name="category"
              type="text"
              defaultValue={a.category ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="manufacturer" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Manufacturer
              </label>
              <input
                id="manufacturer"
                name="manufacturer"
                type="text"
                defaultValue={a.manufacturer ?? ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label htmlFor="model" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Model
              </label>
              <input
                id="model"
                name="model"
                type="text"
                defaultValue={a.model ?? ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
          </div>
          <div>
            <label htmlFor="serial_number" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Serial number
            </label>
            <input
              id="serial_number"
              name="serial_number"
              type="text"
              defaultValue={a.serial_number ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="install_date" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Install date
              </label>
              <input
                id="install_date"
                name="install_date"
                type="date"
                defaultValue={a.install_date ?? ""}
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
                defaultValue={a.status}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={a.notes ?? ""}
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
