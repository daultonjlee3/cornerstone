"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useCallback } from "react";
import { deleteAsset, updateAssetStatus } from "../actions";
import type { Asset } from "./asset-form-modal";
import { AssetFormModal } from "./asset-form-modal";
import { WorkOrderFormModal } from "@/app/(authenticated)/work-orders/components/work-order-form-modal";
import type { WorkOrderPrefill } from "@/app/(authenticated)/work-orders/components/work-order-form-modal";
import { StatusBadge } from "@/src/components/ui/status-badge";

type CompanyOption = { id: string; name: string };
type PropertyOption = { id: string; name: string; company_id?: string | undefined };
type BuildingOption = { id: string; name: string; property_id?: string | undefined };
type UnitOption = { id: string; name: string; building_id?: string | undefined };

export type AssetRow = Asset & {
  property_name?: string;
  building_name?: string;
  unit_name?: string;
  company_name?: string;
  asset_type?: string | null;
  condition?: string | null;
  health_score?: number | null;
  failure_risk?: number | null;
};

type FilterParams = {
  q: string;
  company_id: string;
  property_id: string;
  type: string;
  condition: string;
  status: string;
  health_status: string;
};

type StatusOption = { value: string; label: string };

/** Option types compatible with WorkOrderFormModal (ids may be optional from page data). */
type WorkOrderFormData = {
  companies: { id: string; name: string }[];
  customers: { id: string; name: string; company_id: string }[];
  properties: { id: string; name: string; company_id?: string }[];
  buildings: { id: string; name: string; property_id?: string }[];
  units: { id: string; name: string; building_id?: string }[];
  assets: { id: string; name: string; company_id: string; property_id: string | null; building_id: string | null; unit_id: string | null }[];
  technicians: { id: string; name: string }[];
  crews: { id: string; name: string; company_id: string | null }[];
  vendors: { id: string; name: string; company_id: string; service_type?: string | null }[];
  saveWorkOrder: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

type AssetsListProps = {
  assets: AssetRow[];
  companies: CompanyOption[];
  properties: PropertyOption[];
  buildings: BuildingOption[];
  units: UnitOption[];
  typeOptions: string[];
  conditionOptions: readonly string[];
  statusOptions: readonly StatusOption[];
  filterParams: FilterParams;
  error?: string | null;
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  workOrderFormData?: WorkOrderFormData | null;
};

function assetDisplayName(a: AssetRow): string {
  return a.asset_name ?? a.name ?? "—";
}

function locationDisplay(a: AssetRow): string {
  const parts = [a.property_name, a.building_name, a.unit_name].filter(Boolean);
  return parts.length ? parts.join(" / ") : "—";
}

function typeDisplay(a: AssetRow): string {
  return a.asset_type ?? a.category ?? "—";
}

function healthToneClass(score: number): string {
  if (score >= 90) return "bg-emerald-100 text-emerald-700";
  if (score >= 70) return "bg-blue-100 text-blue-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  if (score >= 30) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

/** Build work order prefill from asset for quick-dispatch modal. Populates full location hierarchy. */
function buildWoPrefillFromAsset(a: AssetRow): WorkOrderPrefill {
  const name = assetDisplayName(a);
  return {
    company_id: a.company_id,
    property_id: a.property_id ?? undefined,
    building_id: a.building_id ?? undefined,
    unit_id: a.unit_id ?? undefined,
    asset_id: a.id,
    title: `Service - ${name}`,
    description: `Maintenance request for asset: ${name}`,
  };
}

function buildParams(
  searchParams: URLSearchParams,
  updates: Record<string, string>
): string {
  const next = new URLSearchParams(searchParams.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (value === "" || value == null) next.delete(key);
    else next.set(key, value);
  });
  return next.toString();
}

export function AssetsList({
  assets: initialAssets,
  companies,
  properties,
  buildings,
  units,
  typeOptions,
  conditionOptions,
  statusOptions,
  filterParams,
  error: initialError,
  saveAction,
  workOrderFormData,
}: AssetsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [selectedAssetForWO, setSelectedAssetForWO] = useState<AssetRow | null>(null);

  const applyFilters = useCallback(
    (updates: Record<string, string>) => {
      const query = buildParams(searchParams, updates);
      startTransition(() => {
        router.push(`/assets${query ? `?${query}` : ""}`);
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const nextQ = String(formData.get("q") ?? "").trim();
    applyFilters({ q: nextQ });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete asset "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteAsset(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Asset deleted." });
        router.refresh();
      }
    });
  };

  const handleStatusChange = (id: string, status: "inactive" | "retired", name: string) => {
    startTransition(async () => {
      const result = await updateAssetStatus(id, status);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: `Asset set to ${status}.` });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingAsset(null);
    setModalOpen(true);
  };
  const openEdit = (a: Asset) => {
    setEditingAsset(a);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingAsset(null);
    router.refresh();
  };
  const openCreateWO = (a: AssetRow) => {
    setSelectedAssetForWO(a);
  };
  const closeWoModal = () => {
    setSelectedAssetForWO(null);
    router.refresh();
  };

  const propertiesFiltered = filterParams.company_id
    ? properties.filter((p) => p.company_id === filterParams.company_id)
    : properties;

  if (initialError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{initialError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-medium text-[var(--foreground)]">Assets</h2>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          Create Asset
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="assets-q" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Search
            </label>
            <input
              id="assets-q"
              name="q"
              type="search"
              defaultValue={filterParams.q}
              placeholder="Name, tag, model, serial..."
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="w-40">
            <label htmlFor="assets-company" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Company
            </label>
            <select
              id="assets-company"
              value={filterParams.company_id}
              onChange={(e) =>
                applyFilters({ company_id: e.target.value, property_id: "" })
              }
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">All</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label htmlFor="assets-property" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Property
            </label>
            <select
              id="assets-property"
              value={filterParams.property_id}
              onChange={(e) => applyFilters({ property_id: e.target.value })}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">All</option>
              {propertiesFiltered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-36">
            <label htmlFor="assets-type" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Type
            </label>
            <select
              id="assets-type"
              value={filterParams.type}
              onChange={(e) => applyFilters({ type: e.target.value })}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">All</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label htmlFor="assets-condition" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Condition
            </label>
            <select
              id="assets-condition"
              value={filterParams.condition}
              onChange={(e) => applyFilters({ condition: e.target.value })}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">All</option>
              {conditionOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label htmlFor="assets-status" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Status
            </label>
            <select
              id="assets-status"
              value={filterParams.status}
              onChange={(e) => applyFilters({ status: e.target.value })}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">All</option>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-36">
            <label htmlFor="assets-health-status" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Health
            </label>
            <select
              id="assets-health-status"
              value={filterParams.health_status}
              onChange={(e) => applyFilters({ health_status: e.target.value })}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">All</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="warning">Warning</option>
              <option value="poor">Poor</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            Search
          </button>
          {(filterParams.q || filterParams.company_id || filterParams.property_id || filterParams.type || filterParams.condition || filterParams.status || filterParams.health_status) && (
            <button
              type="button"
              onClick={() =>
                applyFilters({
                  q: "",
                  company_id: "",
                  property_id: "",
                  type: "",
                  condition: "",
                  status: "",
                  health_status: "",
                })
              }
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {initialAssets.length === 0 ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">
            {filterParams.q || filterParams.company_id || filterParams.property_id || filterParams.type || filterParams.condition || filterParams.status || filterParams.health_status
              ? "No assets match your filters."
              : "No assets yet."}
          </p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Add your first asset
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/70 text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3 font-semibold">Asset</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Health</th>
                  <th className="px-4 py-3 font-semibold">Property</th>
                  <th className="px-4 py-3 font-semibold">Building</th>
                  <th className="px-4 py-3 font-semibold">Unit</th>
                  <th className="px-4 py-3 font-semibold">Manufacturer</th>
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">Condition</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="w-40 px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialAssets.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--card-border)] last:border-0 transition-colors hover:bg-[var(--background)]/50"
                  >
                    <td className="px-4 py-3.5 text-[var(--foreground)]">
                      <Link
                        href={`/assets/${a.id}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {assetDisplayName(a)}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{typeDisplay(a)}</td>
                    <td className="px-4 py-3.5">
                      {a.health_score != null ? (
                        <div className="space-y-1">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${healthToneClass(
                              Number(a.health_score)
                            )}`}
                          >
                            {Number(a.health_score).toFixed(0)}
                          </span>
                          <p className="text-[11px] text-[var(--muted)]">
                            Risk {a.failure_risk != null ? Number(a.failure_risk).toFixed(0) : "—"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{a.property_name ?? "—"}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{a.building_name ?? "—"}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{a.unit_name ?? "—"}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{a.manufacturer ?? "—"}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{a.model ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      {a.condition ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.condition === "excellent"
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : a.condition === "good"
                              ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                              : a.condition === "fair"
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                              : "bg-red-500/20 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {a.condition}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/assets/${a.id}`}
                          className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          Edit
                        </button>
                        {a.status === "active" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(a.id, "inactive", assetDisplayName(a))}
                              disabled={isPending}
                              className="rounded text-amber-600 hover:underline disabled:opacity-50 dark:text-amber-400"
                            >
                              Set inactive
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(a.id, "retired", assetDisplayName(a))}
                              disabled={isPending}
                              className="rounded text-[var(--muted)] hover:underline disabled:opacity-50"
                            >
                              Retire
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => openCreateWO(a)}
                          className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          Create WO
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id, assetDisplayName(a))}
                          disabled={isPending}
                          className="rounded text-red-500 hover:underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
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

      <AssetFormModal
        open={modalOpen}
        onClose={closeModal}
        asset={editingAsset}
        companies={companies}
        properties={properties}
        buildings={buildings}
        units={units}
        saveAction={saveAction}
      />

      {workOrderFormData && selectedAssetForWO ? (
        <WorkOrderFormModal
          open={true}
          onClose={closeWoModal}
          workOrder={null}
          prefill={selectedAssetForWO ? buildWoPrefillFromAsset(selectedAssetForWO) : null}
          companies={workOrderFormData.companies}
          customers={workOrderFormData.customers}
          properties={workOrderFormData.properties as { id: string; name: string; company_id: string }[]}
          buildings={workOrderFormData.buildings as { id: string; name: string; property_id: string }[]}
          units={workOrderFormData.units as { id: string; name: string; building_id: string }[]}
          assets={workOrderFormData.assets}
          technicians={workOrderFormData.technicians}
          crews={workOrderFormData.crews}
          vendors={workOrderFormData.vendors}
          saveAction={workOrderFormData.saveWorkOrder}
        />
      ) : null}
    </div>
  );
}
