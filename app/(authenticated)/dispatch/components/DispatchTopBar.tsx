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

  const setView = (viewMode: "day" | "week" | "month" | "map") => {
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

  const selectClass = "ui-select min-h-0 w-auto min-w-0 py-1 text-[11px]";
  return (
    <div className="shrink-0 border-b border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--card-border)]/40 hover:text-[var(--foreground)]"
            aria-label="Previous day"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[140px] text-xs font-medium text-[var(--foreground)]">
            {formatDisplayDate(filterState.selectedDate)}
          </span>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--card-border)]/40 hover:text-[var(--foreground)]"
            aria-label="Next day"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex rounded border border-[var(--card-border)] bg-[var(--background)] p-0.5" role="tablist" aria-label="Dispatch view">
          {(["day", "week", "month", "map"] as const).map((mode) => (
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
              {mode}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
          className="ui-input h-7 w-32 min-w-0 shrink-0 py-0 text-[11px] sm:w-40"
        />
        <button
          type="button"
          onClick={applySearch}
          className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]/40"
        >
          Search
        </button>
        <select
          value={filterState.companyId}
          onChange={(e) => patchState({ companyId: e.target.value })}
          className={selectClass}
          title="Company"
        >
          <option value="">All companies</option>
          {filterOptions.companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterState.propertyId}
          onChange={(e) => patchState({ propertyId: e.target.value })}
          className={selectClass}
          title="Property"
        >
          <option value="">All properties</option>
          {propertyOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.property_name ?? p.name ?? p.id}</option>
          ))}
        </select>
        <select
          value={filterState.buildingId}
          onChange={(e) => patchState({ buildingId: e.target.value })}
          className={selectClass}
          title="Building"
        >
          <option value="">All buildings</option>
          {buildingOptions.map((b) => (
            <option key={b.id} value={b.id}>{b.building_name ?? b.name ?? b.id}</option>
          ))}
        </select>
        <select
          value={filterState.status}
          onChange={(e) => patchState({ status: e.target.value })}
          className={selectClass}
          title="Status"
        >
          <option value="">All statuses</option>
          {filterOptions.statuses.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterState.priority}
          onChange={(e) => patchState({ priority: e.target.value })}
          className={selectClass}
          title="Priority"
        >
          <option value="">All priorities</option>
          {filterOptions.priorities.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterState.assignmentType}
          onChange={(e) => patchState({ assignmentType: e.target.value })}
          className={selectClass}
          title="Assignment"
        >
          <option value="">Assignment</option>
          {filterOptions.assignmentTypes.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filterState.technicianId}
          onChange={(e) => patchState({ technicianId: e.target.value })}
          className={`${selectClass} max-w-[100px]`}
          title="Technician"
        >
          <option value="">All techs</option>
          {filterOptions.technicians.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={filterState.crewId}
          onChange={(e) => patchState({ crewId: e.target.value })}
          className={selectClass}
          title="Crew"
        >
          <option value="">All crews</option>
          {filterOptions.crews.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="ml-1 shrink-0 border-l border-[var(--card-border)] pl-2" />
        <span className="rounded border border-red-200/80 bg-red-50/80 px-1 py-0.5 text-[10px] text-red-700">
          O: {insights.overdue}
        </span>
        <span className="rounded border border-emerald-200/80 bg-emerald-50/80 px-1 py-0.5 text-[10px] text-emerald-700">
          R: {insights.ready}
        </span>
        <span className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] text-slate-700">
          U: {insights.unscheduled}
        </span>
        <span className="rounded border border-blue-200/80 bg-blue-50/80 px-1 py-0.5 text-[10px] text-blue-700">
          Today: {insights.scheduledToday}
        </span>
        {hasActiveFilters(filterState) ? (
          <Button variant="secondary" size="sm" className="h-6 px-1.5 text-[10px]" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
