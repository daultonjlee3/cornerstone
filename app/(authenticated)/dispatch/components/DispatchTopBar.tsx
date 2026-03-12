"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { DispatchFilterState } from "../filter-state";
import { filterStateToParams, hasActiveFilters } from "../filter-state";
import type { DispatchFilterOptions, DispatchInsights } from "../dispatch-data";
import { Button } from "@/src/components/ui/button";

export type DispatchTopBarProps = {
  filterState: DispatchFilterState;
  filterOptions: DispatchFilterOptions;
  insights: DispatchInsights;
};

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function DispatchTopBar({ filterState, filterOptions, insights }: DispatchTopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchText, setSearchText] = useState(filterState.search);

  const propertyOptions = useMemo(() => {
    if (!filterState.companyId) return filterOptions.properties;
    return filterOptions.properties.filter((row) => row.company_id === filterState.companyId);
  }, [filterOptions.properties, filterState.companyId]);
  const buildingOptions = useMemo(() => {
    const scopedByCompany = filterState.companyId
      ? filterOptions.buildings.filter((row) => row.company_id === filterState.companyId)
      : filterOptions.buildings;
    if (!filterState.propertyId) return scopedByCompany;
    return scopedByCompany.filter((row) => row.property_id === filterState.propertyId);
  }, [filterOptions.buildings, filterState.companyId, filterState.propertyId]);

  const pushState = (next: DispatchFilterState) => {
    const params = filterStateToParams(next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const patchState = (patch: Partial<DispatchFilterState>) => {
    const next: DispatchFilterState = {
      ...filterState,
      ...patch,
    };
    if (
      patch.companyId !== undefined &&
      patch.companyId !== filterState.companyId
    ) {
      next.propertyId = "";
      next.buildingId = "";
    }
    if (
      patch.propertyId !== undefined &&
      patch.propertyId !== filterState.propertyId
    ) {
      next.buildingId = "";
    }
    pushState(next);
  };

  const setView = (viewMode: "day" | "week" | "month" | "map" | "combined") => {
    patchState({ viewMode });
  };

  const shiftDate = (delta: number) => {
    const d = new Date(filterState.selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const date = `${y}-${m}-${day}`;
    patchState({ selectedDate: date });
  };

  const applySearch = () => {
    patchState({ search: searchText.trim() });
  };

  const clearFilters = () => {
    setSearchText("");
    patchState({
      search: "",
      companyId: "",
      propertyId: "",
      buildingId: "",
      priority: "",
      status: "",
      crewId: "",
      technicianId: "",
      assignmentType: "",
      assetId: "",
      category: "",
    });
  };

  const selectBase =
    "h-7 min-h-0 w-auto max-w-[10rem] shrink-0 rounded border border-[var(--card-border)] bg-[var(--card)] py-0 pl-2 pr-6 text-[11px] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";
  return (
    <div className="shrink-0 border-b border-[var(--card-border)] bg-[var(--card)] px-2 py-1">
      {/* Row 1: Date navigation + view tabs */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--card-border)]/40 hover:text-[var(--foreground)]"
            aria-label="Previous"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[132px] text-[11px] font-medium text-[var(--foreground)]">
            {formatDisplayDate(filterState.selectedDate)}
          </span>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--card-border)]/40 hover:text-[var(--foreground)]"
            aria-label="Next"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex rounded border border-[var(--card-border)] bg-[var(--background)] p-0.5" role="tablist" aria-label="Dispatch view">
          {(["day", "week", "month", "map", "combined"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={filterState.viewMode === mode}
              onClick={() => setView(mode)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium capitalize ${
                filterState.viewMode === mode
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {mode === "combined" ? "Combined" : mode}
            </button>
          ))}
        </div>
      </div>
      {/* Row 2: Search bar */}
      <div className="mt-1 flex items-center gap-1.5">
        <input
          type="search"
          placeholder="Search work orders by #, title…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
          className="ui-input h-7 min-h-0 flex-1 min-w-0 rounded py-0 text-[11px]"
        />
        <button
          type="button"
          onClick={applySearch}
          className="shrink-0 rounded border border-[var(--card-border)] bg-[var(--background)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]/50"
        >
          Search
        </button>
      </div>
      {/* Row 3: Inline dropdown filters — compact toolbar strip */}
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-md border border-[var(--card-border)]/80 bg-[var(--background)]/60 px-2 py-1.5">
        <select
          value={filterState.companyId}
          onChange={(e) => patchState({ companyId: e.target.value })}
          className={selectBase}
          title="Company"
        >
          <option value="">Company</option>
          {filterOptions.companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterState.propertyId}
          onChange={(e) => patchState({ propertyId: e.target.value })}
          className={selectBase}
          title="Property"
        >
          <option value="">Property</option>
          {propertyOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.property_name ?? p.name ?? p.id}</option>
          ))}
        </select>
        <select
          value={filterState.buildingId}
          onChange={(e) => patchState({ buildingId: e.target.value })}
          className={selectBase}
          title="Building"
        >
          <option value="">Building</option>
          {buildingOptions.map((b) => (
            <option key={b.id} value={b.id}>{b.building_name ?? b.name ?? b.id}</option>
          ))}
        </select>
        <select
          value={filterState.assetId}
          onChange={(e) => patchState({ assetId: e.target.value })}
          className={selectBase}
          title="Asset"
        >
          <option value="">Asset</option>
          {filterOptions.assets.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          value={filterState.priority}
          onChange={(e) => patchState({ priority: e.target.value })}
          className={selectBase}
          title="Priority"
        >
          <option value="">Priority</option>
          {filterOptions.priorities.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterState.status}
          onChange={(e) => patchState({ status: e.target.value })}
          className={selectBase}
          title="Status"
        >
          <option value="">Status</option>
          {filterOptions.statuses.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterState.technicianId}
          onChange={(e) => patchState({ technicianId: e.target.value })}
          className={`${selectBase} max-w-[7.5rem]`}
          title="Technician"
        >
          <option value="">Technician</option>
          {filterOptions.technicians.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={filterState.crewId}
          onChange={(e) => patchState({ crewId: e.target.value })}
          className={selectBase}
          title="Crew"
        >
          <option value="">Crew</option>
          {filterOptions.crews.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterState.assignmentType}
          onChange={(e) => patchState({ assignmentType: e.target.value })}
          className={selectBase}
          title="Assignment type"
        >
          <option value="">Assignment</option>
          {filterOptions.assignmentTypes.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="mx-0.5 shrink-0 border-l border-[var(--card-border)]" aria-hidden />
        <span className="rounded border border-red-200/80 bg-red-50/80 px-1.5 py-0.5 text-[10px] font-medium text-red-700">O: {insights.overdue}</span>
        <span className="rounded border border-emerald-200/80 bg-emerald-50/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">R: {insights.ready}</span>
        <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">U: {insights.unscheduled}</span>
        <span className="rounded border border-blue-200/80 bg-blue-50/80 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Today: {insights.scheduledToday}</span>
        {hasActiveFilters(filterState) ? (
          <Button variant="secondary" size="sm" className="h-6 shrink-0 px-2 text-[10px]" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
