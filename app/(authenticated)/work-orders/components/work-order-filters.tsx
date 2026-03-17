"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";

type FilterOptions = {
  companies: { id: string; name: string }[];
  properties: { id: string; name: string; company_id: string }[];
  buildings: { id: string; name: string; property_id: string }[];
  units: { id: string; name: string; building_id: string }[];
  assets: { id: string; name: string; company_id: string; property_id: string | null; building_id: string | null; unit_id: string | null }[];
  technicians: { id: string; name: string }[];
  crews: { id: string; name: string; company_id?: string | null }[];
};

const STATUS_OPTIONS = [
  "new",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent", "emergency"] as const;
const CATEGORY_OPTIONS = ["repair", "preventive_maintenance", "inspection", "installation", "emergency", "general"] as const;
const SORT_OPTIONS = [
  { value: "updated_at", label: "Updated" },
  { value: "scheduled_date", label: "Scheduled date" },
  { value: "due_date", label: "Due date" },
  { value: "completed_at", label: "Completed date" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
] as const;
const COMPLETION_STATUS_OPTIONS = [
  "successful",
  "partially_completed",
  "deferred",
  "unable_to_complete",
] as const;

type WorkOrderFiltersProps = {
  options: FilterOptions;
};

export function WorkOrderFilters({ options }: WorkOrderFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const category = searchParams.get("category") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const propertyId = searchParams.get("property_id") ?? "";
  const technicianId = searchParams.get("technician_id") ?? "";
  const crewId = searchParams.get("crew_id") ?? "";
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const completedFrom = searchParams.get("completed_from") ?? "";
  const completedTo = searchParams.get("completed_to") ?? "";
  const completionStatus = searchParams.get("completion_status") ?? "";
  const buildingId = searchParams.get("building_id") ?? "";
  const unitId = searchParams.get("unit_id") ?? "";
  const assetId = searchParams.get("asset_id") ?? "";
  const sourceType = searchParams.get("source_type") ?? "";
  const overdue = searchParams.get("overdue") ?? "";
  const unassigned = searchParams.get("unassigned") ?? "";
  const sort = searchParams.get("sort") ?? "updated_at";
  const order = searchParams.get("order") ?? "desc";

  const propertiesFiltered = companyId ? options.properties.filter((p) => p.company_id === companyId) : options.properties;
  const buildingsFiltered = propertyId ? options.buildings.filter((b) => b.property_id === propertyId) : options.buildings;
  const unitsFiltered = buildingId ? options.units.filter((u) => u.building_id === buildingId) : options.units;
  const assetsFiltered = companyId
    ? options.assets.filter((a) => {
        if (a.company_id !== companyId) return false;
        if (unitId) return a.unit_id === unitId;
        if (buildingId) return a.building_id === buildingId;
        if (propertyId) return a.property_id === propertyId;
        return true;
      })
    : options.assets;
  const crewsFiltered = companyId ? options.crews.filter((c) => !c.company_id || c.company_id === companyId) : options.crews;

  const buildParams = (updates: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!keepPage) next.delete("page");
    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, value);
    });
    return next.toString();
  };

  const apply = (updates: Record<string, string>, options?: { keepPage?: boolean }) => {
    const query = buildParams(updates, options?.keepPage ?? false);
    startTransition(() => {
      router.replace(`/work-orders${query ? `?${query}` : ""}`, { scroll: false });
    });
  };

  const handleSearch = (value: string) => apply({ q: value });
  const clearAll = () => {
    startTransition(() => router.replace("/work-orders"));
  };

  const hasActiveFilters =
    q || status || priority || category || companyId || propertyId || buildingId || unitId || assetId || technicianId || crewId || sourceType || overdue || unassigned || dateFrom || dateTo || completedFrom || completedTo || completionStatus;

  const inputClass =
    "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";
  const labelClass = "mb-0.5 block text-xs font-medium text-[var(--muted)]";

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/50"
      >
        <span className="flex items-center gap-2">
          Filters
          {hasActiveFilters && (
            <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-xs text-[var(--accent)]">
              Active
            </span>
          )}
        </span>
        <span className="text-[var(--muted)]">{isOpen ? "▼" : "▶"}</span>
      </button>
      {isOpen && (
        <div className="border-t border-[var(--card-border)] p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="wo-filter-q" className={labelClass}>
                Search (title, #, description, requested by)
              </label>
              <input
                key={q}
                id="wo-filter-q"
                type="text"
                placeholder="Search..."
                defaultValue={q}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) apply({ q: "" });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch(e.currentTarget.value);
                }}
                onBlur={(e) => handleSearch(e.currentTarget.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wo-filter-status" className={labelClass}>
                Status
              </label>
              <select
                id="wo-filter-status"
                value={status}
                onChange={(e) => apply({ status: e.target.value })}
                className={inputClass}
              >
                <option value="">All</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-priority" className={labelClass}>
                Priority
              </label>
              <select
                id="wo-filter-priority"
                value={priority}
                onChange={(e) => apply({ priority: e.target.value })}
                className={inputClass}
              >
                <option value="">All</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-category" className={labelClass}>
                Category
              </label>
              <select
                id="wo-filter-category"
                value={category}
                onChange={(e) => apply({ category: e.target.value })}
                className={inputClass}
              >
                <option value="">All</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-company" className={labelClass}>
                Company
              </label>
              <select
                id="wo-filter-company"
                value={companyId}
                onChange={(e) => apply({ company_id: e.target.value, property_id: "" })}
                className={inputClass}
              >
                <option value="">All</option>
                {options.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-property" className={labelClass}>
                Property
              </label>
              <select
                id="wo-filter-property"
                value={propertyId}
                onChange={(e) => apply({ property_id: e.target.value, building_id: "", unit_id: "", asset_id: "" })}
                className={inputClass}
              >
                <option value="">All</option>
                {propertiesFiltered.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-building" className={labelClass}>
                Building
              </label>
              <select
                id="wo-filter-building"
                value={buildingId}
                onChange={(e) => apply({ building_id: e.target.value, unit_id: "", asset_id: "" })}
                className={inputClass}
              >
                <option value="">All</option>
                {buildingsFiltered.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-unit" className={labelClass}>
                Unit
              </label>
              <select
                id="wo-filter-unit"
                value={unitId}
                onChange={(e) => apply({ unit_id: e.target.value, asset_id: "" })}
                className={inputClass}
              >
                <option value="">All</option>
                {unitsFiltered.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-asset" className={labelClass}>
                Asset
              </label>
              <select
                id="wo-filter-asset"
                value={assetId}
                onChange={(e) => apply({ asset_id: e.target.value })}
                className={inputClass}
              >
                <option value="">All</option>
                {assetsFiltered.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-source" className={labelClass}>
                Source
              </label>
              <select
                id="wo-filter-source"
                value={sourceType}
                onChange={(e) => apply({ source_type: e.target.value })}
                className={inputClass}
              >
                <option value="">All</option>
                <option value="manual">Manual</option>
                <option value="preventive_maintenance">Preventive Maintenance</option>
                <option value="reactive">Reactive</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={overdue === "1"}
                  onChange={(e) => apply({ overdue: e.target.checked ? "1" : "" })}
                  className="rounded border-[var(--card-border)]"
                />
                Overdue only
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={unassigned === "1"}
                  onChange={(e) => apply({ unassigned: e.target.checked ? "1" : "" })}
                  className="rounded border-[var(--card-border)]"
                />
                Unassigned only
              </label>
            </div>
            <div>
              <label htmlFor="wo-filter-technician" className={labelClass}>
                Technician
              </label>
              <select
                id="wo-filter-technician"
                value={technicianId}
                onChange={(e) => apply({ technician_id: e.target.value })}
                className={inputClass}
              >
                <option value="">All</option>
                {options.technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-crew" className={labelClass}>
                Crew
              </label>
              <select
                id="wo-filter-crew"
                value={crewId}
                onChange={(e) => apply({ crew_id: e.target.value })}
                className={inputClass}
              >
                <option value="">All</option>
                {crewsFiltered.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-completion-status" className={labelClass}>
                Completion result
              </label>
              <select
                id="wo-filter-completion-status"
                value={completionStatus}
                onChange={(e) => apply({ completion_status: e.target.value })}
                className={inputClass}
              >
                <option value="">All</option>
                {COMPLETION_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-date-from" className={labelClass}>
                Scheduled from
              </label>
              <input
                id="wo-filter-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => apply({ date_from: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wo-filter-date-to" className={labelClass}>
                Scheduled to
              </label>
              <input
                id="wo-filter-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => apply({ date_to: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wo-filter-completed-from" className={labelClass}>
                Completed from
              </label>
              <input
                id="wo-filter-completed-from"
                type="date"
                value={completedFrom}
                onChange={(e) => apply({ completed_from: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wo-filter-completed-to" className={labelClass}>
                Completed to
              </label>
              <input
                id="wo-filter-completed-to"
                type="date"
                value={completedTo}
                onChange={(e) => apply({ completed_to: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wo-filter-sort" className={labelClass}>
                Sort by
              </label>
              <select
                id="wo-filter-sort"
                value={sort}
                onChange={(e) => apply({ sort: e.target.value })}
                className={inputClass}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wo-filter-order" className={labelClass}>
                Order
              </label>
              <select
                id="wo-filter-order"
                value={order}
                onChange={(e) => apply({ order: e.target.value })}
                className={inputClass}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAll}
                disabled={isPending}
                className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                Clear filters
              </button>
            )}
            {isPending && <span className="text-xs text-[var(--muted)]">Updating…</span>}
          </div>
        </div>
      )}
    </div>
  );
}
