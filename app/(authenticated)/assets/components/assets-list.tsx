"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useCallback, useEffect } from "react";
import { deleteAsset, updateAssetStatus } from "../actions";
import type { Asset } from "./asset-form-modal";
import { AssetFormModal } from "./asset-form-modal";
import { WorkOrderFormModal } from "@/app/(authenticated)/work-orders/components/work-order-form-modal";
import type { WorkOrderPrefill } from "@/app/(authenticated)/work-orders/components/work-order-form-modal";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { Hint } from "@/src/components/ui/hint";
import { ActionsDropdown, type ActionsDropdownItem } from "@/src/components/ui/actions-dropdown";
import { Pagination } from "@/src/components/ui/pagination";
import { PreventiveMaintenancePlanFormModal } from "@/app/(authenticated)/preventive-maintenance/components/pm-plan-form-modal";
import { SummaryCardsBar, SavedViewsBar, CommandCenterLayout } from "@/src/components/command-center";
import { Activity, AlertTriangle, PauseCircle, CalendarClock } from "lucide-react";
import { AssetCommandCenterPane } from "./asset-command-center-pane";

type CompanyOption = { id: string; name: string };
type PropertyOption = { id: string; name: string; company_id?: string | undefined };
type BuildingOption = { id: string; name: string; property_id?: string | undefined };
type UnitOption = { id: string; name: string; building_id?: string | undefined };

export type AssetRow = Asset & {
  property_name?: string;
  building_name?: string;
  unit_name?: string;
  company_name?: string;
  parent_asset_name?: string | null;
  parent_asset_id?: string | null;
  is_parent_asset?: boolean;
  child_count?: number;
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
  hierarchy: string;
  view: string;
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
  pmPlanCount?: number;
  pmModalData?: {
    companies: { id: string; name: string }[];
    assets: { id: string; name: string; company_id: string; property_id: string | null; building_id: string | null; unit_id: string | null }[];
    technicians: { id: string; name: string; company_id: string }[];
    saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  } | null;
  workOrderFormData?: WorkOrderFormData | null;
  parentCandidates: { id: string; name: string; company_id: string; parent_asset_id: string | null }[];
  /** When set, pagination is shown. Omit when not using server-side pagination. */
  totalCount?: number | null;
  page?: number;
  pageSize?: number;
  /** Stable summary counts (tenant scope only). Used for cards; do not mix with list filters. */
  assetStats?: {
    active: number;
    needsAttention: number;
    outOfService: number;
    dueForPm: number;
  };
  /** When set (e.g. from /assets?edit=id), open the edit modal for this asset. */
  initialEditAsset?: Asset | null;
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
  pmPlanCount = 0,
  pmModalData = null,
  parentCandidates,
  totalCount: totalCountProp,
  page: pageProp = 1,
  pageSize: pageSizeProp = 25,
  assetStats,
  initialEditAsset = null,
}: AssetsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [selectedAssetForWO, setSelectedAssetForWO] = useState<AssetRow | null>(null);
  const [selectedAssetForPM, setSelectedAssetForPM] = useState<AssetRow | null>(null);
  const [detailDrawerAsset, setDetailDrawerAsset] = useState<AssetRow | null>(null);

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
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const get = (key: string) => (formData.get(key) != null ? String(formData.get(key)).trim() : "");
    applyFilters({
      q: get("q"),
      company_id: get("company_id"),
      property_id: get("property_id"),
      type: get("type"),
      condition: get("condition"),
      status: get("status"),
      health_status: get("health_status"),
      hierarchy: get("hierarchy"),
      view: get("view"),
      page: "1",
    });
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

  useEffect(() => {
    if (!initialEditAsset?.id) return;
    if (searchParams.get("edit") !== initialEditAsset.id) return;
    setEditingAsset(initialEditAsset);
    setModalOpen(true);
    router.replace("/assets", { scroll: false });
  }, [initialEditAsset, searchParams, router]);

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
    <div className="space-y-4" data-tour="assets:asset-list">
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
      {initialAssets.length > 0 && pmPlanCount === 0 && (
        <Hint
          id="assets-no-pm"
          variant="card"
          title="Suggest preventive maintenance"
          message="You have assets but no PM schedules. Create recurring plans to auto-generate work orders and keep equipment maintained."
          action={
            <Link href="/preventive-maintenance" className="text-sm font-medium text-[var(--accent)] hover:underline">
              Go to Preventive Maintenance →
            </Link>
          }
        />
      )}
      {assetStats != null && (
        <>
          <SummaryCardsBar
            path="/assets"
            cards={[
              { key: "active", label: "Active", value: assetStats.active, view: "active", icon: Activity },
              {
                key: "needsAttention",
                label: "Needs Attention",
                value: assetStats.needsAttention,
                view: "needs_attention",
                tone: "bad",
                icon: AlertTriangle,
                variant: assetStats.needsAttention > 0 ? "danger" : "default",
              },
              {
                key: "outOfService",
                label: "Out of Service",
                value: assetStats.outOfService,
                view: "out_of_service",
                icon: PauseCircle,
              },
              {
                key: "dueForPm",
                label: "Due for PM",
                value: assetStats.dueForPm,
                view: "due_for_pm",
                tone: assetStats.dueForPm > 0 ? "bad" : "neutral",
                icon: CalendarClock,
                variant: assetStats.dueForPm > 0 ? "danger" : "default",
              },
            ]}
          />
          <SavedViewsBar
            path="/assets"
            views={[
              { id: "all", label: "All", value: "" },
              { id: "active", label: "Active", value: "active" },
              { id: "needs_attention", label: "Needs Attention", value: "needs_attention" },
              { id: "out_of_service", label: "Out of Service", value: "out_of_service" },
              { id: "due_for_pm", label: "Due for PM", value: "due_for_pm" },
            ]}
          />
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4" data-tour="assets:schedule-pm">
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
              name="company_id"
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
              name="type"
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
              name="condition"
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
              name="status"
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
          <div className="w-40">
            <label htmlFor="assets-hierarchy" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Hierarchy
            </label>
            <select
              id="assets-hierarchy"
              name="hierarchy"
              value={filterParams.hierarchy}
              onChange={(e) => applyFilters({ hierarchy: e.target.value })}
              className="w-full rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">All assets</option>
              <option value="parents">Parent assets only</option>
              <option value="sub_assets">Sub-assets only</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            Search
          </button>
          {(filterParams.q || filterParams.company_id || filterParams.property_id || filterParams.type || filterParams.condition || filterParams.status || filterParams.health_status || filterParams.hierarchy || filterParams.view) && (
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
                  hierarchy: "",
                  view: "",
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
        <div className="space-y-4">
          {!filterParams.q && !filterParams.company_id && !filterParams.property_id && !filterParams.type && !filterParams.condition && !filterParams.status && !filterParams.health_status && !filterParams.hierarchy && !filterParams.view && (
            <Hint
              id="assets-no-assets"
              variant="empty-state"
              message="Assets are the foundation of maintenance tracking. Add equipment and systems here, then link work orders and preventive maintenance to them."
            />
          )}
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
            <p className="text-[var(--muted)]">
              {filterParams.q || filterParams.company_id || filterParams.property_id || filterParams.type || filterParams.condition || filterParams.status || filterParams.health_status || filterParams.hierarchy || filterParams.view
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
        </div>
      ) : (
        <CommandCenterLayout
          listContent={
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--card-border)]/80 bg-[var(--card)] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/70 text-xs uppercase tracking-wide text-[var(--muted)]">
                      <th className="px-4 py-3 font-semibold">Asset</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Hierarchy</th>
                      <th className="px-4 py-3 font-semibold">Health</th>
                      <th className="px-4 py-3 font-semibold">Property</th>
                      <th className="px-4 py-3 font-semibold">Building</th>
                      <th className="px-4 py-3 font-semibold">Unit</th>
                      <th className="px-4 py-3 font-semibold">Manufacturer</th>
                      <th className="px-4 py-3 font-semibold">Model</th>
                      <th className="px-4 py-3 font-semibold">Condition</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="w-28 px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody data-tour="assets:maintenance-history">
                    {initialAssets.map((a) => (
                      <tr
                        key={a.id}
                        onClick={() => setDetailDrawerAsset(a)}
                        className={`border-b border-[var(--card-border)] last:border-0 transition-colors cursor-pointer hover:bg-[var(--background)]/50 ${
                          detailDrawerAsset?.id === a.id ? "bg-[var(--accent)]/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5 text-[var(--foreground)]">
                          <div>
                            <span className="font-medium text-[var(--accent)]">
                              {assetDisplayName(a)}
                            </span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(a.child_count ?? 0) > 0 ? (
                                <span className="inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                                  Parent
                                </span>
                              ) : null}
                              {a.parent_asset_id ? (
                                <span className="inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                                  Sub-asset
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[var(--muted)]">{typeDisplay(a)}</td>
                        <td className="px-4 py-3.5 text-[var(--muted)]">
                          {a.parent_asset_id && a.parent_asset_name ? (
                            <span>Child of {a.parent_asset_name}</span>
                          ) : (a.child_count ?? 0) > 0 ? (
                            <span>{a.child_count} sub-assets</span>
                          ) : (
                            "—"
                          )}
                        </td>
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
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <ActionsDropdown
                            align="right"
                            items={[
                              { type: "link", label: "View", href: `/assets/${a.id}` },
                              { type: "button", label: "Edit", onClick: () => openEdit(a) },
                              ...(a.status === "active"
                                ? [
                                    { type: "button" as const, label: "Set inactive", onClick: () => handleStatusChange(a.id, "inactive", assetDisplayName(a)), disabled: isPending },
                                    { type: "button" as const, label: "Retire", onClick: () => handleStatusChange(a.id, "retired", assetDisplayName(a)), disabled: isPending },
                                  ]
                                : []),
                              { type: "button", label: "Create WO", onClick: () => openCreateWO(a) },
                              ...(pmModalData
                                ? [{ type: "button" as const, label: "Schedule PM", onClick: () => setSelectedAssetForPM(a) }]
                                : [{ type: "link" as const, label: "Schedule PM", href: `/preventive-maintenance?new=1&company_id=${encodeURIComponent(a.company_id)}&asset_id=${encodeURIComponent(a.id)}` }]),
                              { type: "button", label: "Delete", onClick: () => handleDelete(a.id, assetDisplayName(a)), disabled: isPending, destructive: true },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalCountProp != null && (
                <Pagination
                  page={pageProp}
                  pageSize={pageSizeProp}
                  totalCount={totalCountProp}
                  onPageChange={(p) => applyFilters({ page: String(p) })}
                  pageSizeOptions={[10, 25, 50, 100]}
                  onPageSizeChange={(size) => applyFilters({ page_size: String(size), page: "1" })}
                />
              )}
            </div>
          }
          detailContent={
            detailDrawerAsset ? (
              <AssetCommandCenterPane
                asset={detailDrawerAsset}
                onClose={() => setDetailDrawerAsset(null)}
              />
            ) : null
          }
          isDetailOpen={!!detailDrawerAsset}
          onCloseDetail={() => setDetailDrawerAsset(null)}
          emptyStateTitle="Asset Details"
          emptyDetailMessage={
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <p className="text-sm leading-relaxed text-[var(--muted)] max-w-[260px]">
                Select an asset to view details, work orders, and PM schedules.
              </p>
              <p className="text-xs text-[var(--muted)]/80">
                Tip: Use the summary cards or saved views to filter the list.
              </p>
            </div>
          }
        />
      )}

      <AssetFormModal
        open={modalOpen}
        onClose={closeModal}
        asset={editingAsset}
        companies={companies}
        properties={properties}
        buildings={buildings}
        units={units}
        parentCandidates={parentCandidates}
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

      {pmModalData && selectedAssetForPM ? (
        <PreventiveMaintenancePlanFormModal
          open={true}
          onClose={() => setSelectedAssetForPM(null)}
          plan={null}
          companies={pmModalData.companies}
          assets={pmModalData.assets}
          technicians={pmModalData.technicians}
          prefill={{ company_id: selectedAssetForPM.company_id, asset_id: selectedAssetForPM.id }}
          saveAction={pmModalData.saveAction}
        />
      ) : null}
    </div>
  );
}
