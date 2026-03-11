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

  const setView = (viewMode: "day" | "week" | "month") => {
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

  return (
    <div className="shrink-0 border-b border-[var(--card-border)] bg-[var(--card)] px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--card-border)]/40 hover:text-[var(--foreground)]"
              aria-label="Previous day"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="min-w-[160px] text-sm font-medium text-[var(--foreground)]">
              {formatDisplayDate(filterState.selectedDate)}
            </span>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--card-border)]/40 hover:text-[var(--foreground)]"
              aria-label="Next day"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex rounded-md border border-[var(--card-border)] bg-[var(--background)] p-0.5">
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`rounded px-2.5 py-1 text-[11px] font-medium capitalize ${
                  filterState.viewMode === mode
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded border border-red-200/80 bg-red-50/80 px-1.5 py-0.5 text-[11px] text-red-700">
            Overdue: {insights.overdue}
          </span>
          <span className="rounded border border-emerald-200/80 bg-emerald-50/80 px-1.5 py-0.5 text-[11px] text-emerald-700">
            Ready: {insights.ready}
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-700">
            Unsched: {insights.unscheduled}
          </span>
          <span className="rounded border border-blue-200/80 bg-blue-50/80 px-1.5 py-0.5 text-[11px] text-blue-700">
            Today: {insights.scheduledToday}
          </span>
          {hasActiveFilters(filterState) ? (
            <Button variant="secondary" size="sm" className="h-7 text-[11px]" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2 xl:grid-cols-3">
        <section className="space-y-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 p-2 xl:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Search & location
          </p>
          <div className="flex gap-1.5">
            <input
              type="search"
              placeholder="Search WO #, title..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              className="ui-input flex-1 min-h-0 py-1.5 text-sm"
            />
            <Button variant="secondary" size="sm" className="shrink-0" onClick={applySearch}>
              Apply
            </Button>
          </div>
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={filterState.companyId}
              onChange={(event) => patchState({ companyId: event.target.value })}
              className="ui-select"
            >
              <option value="">All companies</option>
              {filterOptions.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <select
              value={filterState.propertyId}
              onChange={(event) => patchState({ propertyId: event.target.value })}
              className="ui-select"
            >
              <option value="">All properties</option>
              {propertyOptions.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.property_name ?? property.name ?? property.id}
                </option>
              ))}
            </select>

            <select
              value={filterState.buildingId}
              onChange={(event) => patchState({ buildingId: event.target.value })}
              className="ui-select"
            >
              <option value="">All buildings</option>
              {buildingOptions.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.building_name ?? building.name ?? building.id}
                </option>
              ))}
            </select>

            <select
              value={filterState.assetId}
              onChange={(event) => patchState({ assetId: event.target.value })}
              className="ui-select"
            >
              <option value="">All assets</option>
              {filterOptions.assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>

            <select
              value={filterState.category}
              onChange={(event) => patchState({ category: event.target.value })}
              className="ui-select"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Assignment
          </p>
          <div className="grid gap-1.5 md:grid-cols-3 xl:grid-cols-1">
            <select
              value={filterState.assignmentType}
              onChange={(event) => patchState({ assignmentType: event.target.value })}
              className="ui-select"
            >
              <option value="">All assignment types</option>
              {filterOptions.assignmentTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filterState.technicianId}
              onChange={(event) => patchState({ technicianId: event.target.value })}
              className="ui-select"
            >
              <option value="">All technicians</option>
              {filterOptions.technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name}
                </option>
              ))}
            </select>

            <select
              value={filterState.crewId}
              onChange={(event) => patchState({ crewId: event.target.value })}
              className="ui-select"
            >
              <option value="">All crews</option>
              {filterOptions.crews.map((crew) => (
                <option key={crew.id} value={crew.id}>
                  {crew.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 p-2 xl:col-span-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Status & priority
          </p>
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={filterState.status}
              onChange={(event) => patchState({ status: event.target.value })}
              className="ui-select"
            >
              <option value="">All statuses</option>
              {filterOptions.statuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filterState.priority}
              onChange={(event) => patchState({ priority: event.target.value })}
              className="ui-select"
            >
              <option value="">All priorities</option>
              {filterOptions.priorities.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>
      </div>
    </div>
  );
}
