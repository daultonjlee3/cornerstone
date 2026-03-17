"use client";

import { useMemo, useState, useRef, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import type { DispatchFilterState } from "../filter-state";
import { filterStateToParams, hasActiveFilters } from "../filter-state";
import type { DispatchFilterOptions, DispatchInsights } from "../dispatch-data";
import { Button } from "@/src/components/ui/button";
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";

export type DispatchTopBarProps = {
  filterState: DispatchFilterState;
  filterOptions: DispatchFilterOptions;
  insights: DispatchInsights;
  /** When true (full-screen Combined view), use denser operational layout. */
  opsMode?: boolean;
};

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DispatchCalendarPopoverProps = {
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
};

function DispatchCalendarPopover({ selectedDate, onSelect, onClose, anchorRef }: DispatchCalendarPopoverProps) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate + "T12:00:00"));
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [onClose, anchorRef]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const start = new Date(year, month, 1);
  const startDay = start.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toYYYYMMDD(new Date());

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const calendarEl = (
    <div
      ref={popoverRef}
      className="fixed z-[99999] rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-2 shadow-lg"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 pb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[100px] text-center text-xs font-medium text-[var(--foreground)]">
          {viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="py-0.5 text-[10px] font-medium text-[var(--muted)]">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = toYYYYMMDD(new Date(year, month, day));
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelect(dateStr)}
              className={`h-7 w-7 rounded text-[11px] ${
                isSelected
                  ? "bg-[var(--accent)] text-white"
                  : isToday
                    ? "bg-[var(--background)] font-semibold text-[var(--foreground)]"
                    : "text-[var(--foreground)] hover:bg-[var(--background)]"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(calendarEl, document.body);
}

export function DispatchTopBar({ filterState, filterOptions, insights, opsMode = false }: DispatchTopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [searchText, setSearchText] = useState(filterState.search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const dateButtonRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filtersOpen) return;
    const close = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [filtersOpen]);

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
    const nextQuery = params.toString();
    if (nextQuery === filterStateToParams(filterState).toString()) return;
    startTransition(() => {
      router.replace(`${pathname}?${nextQuery}`, { scroll: false });
    });
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
    "h-7 min-h-0 w-auto max-w-[9rem] shrink-0 rounded-[var(--radius-control)] border border-[var(--card-border)] bg-white py-0 pl-2 pr-6 text-[11px] font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  const filterSelects = (
    <>
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
        className={`${selectBase} max-w-[7rem]`}
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
        title="Assignment"
      >
        <option value="">Assignment</option>
        {filterOptions.assignmentTypes.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </>
  );

  return (
    <div className="shrink-0 border-b border-[var(--card-border)] bg-white/88 px-2 py-1 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {/* Left: Date + view toggle */}
        <div className="relative flex items-center gap-1" ref={dateButtonRef}>
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--card-border)]/40 hover:text-[var(--foreground)]"
            aria-label="Previous date"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setCalendarOpen((o) => !o)}
            className="min-w-[120px] rounded px-1 py-0.5 text-left text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--card-border)]/40"
            aria-label="Choose date"
            aria-expanded={calendarOpen}
          >
            {formatDisplayDate(filterState.selectedDate)}
          </button>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--card-border)]/40 hover:text-[var(--foreground)]"
            aria-label="Next date"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {calendarOpen && (
            <DispatchCalendarPopover
              selectedDate={filterState.selectedDate}
              onSelect={(date) => {
                patchState({ selectedDate: date });
                setCalendarOpen(false);
              }}
              onClose={() => setCalendarOpen(false)}
              anchorRef={dateButtonRef}
            />
          )}
        </div>
        <div className="flex rounded border border-[var(--card-border)] bg-[var(--background)]/70 p-0.5" role="tablist" aria-label="View">
          {(["day", "week", "month", "map"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={filterState.viewMode === mode}
              onClick={() => setView(mode)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                filterState.viewMode === mode ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {mode}
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={filterState.viewMode === "combined"}
            onClick={() => setView("combined")}
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              filterState.viewMode === "combined" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Map+
          </button>
        </div>
        {/* Center: Search */}
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:min-w-[160px]">
          <input
            type="search"
            placeholder="Search work orders…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="ui-input h-7 min-h-0 w-full min-w-0 max-w-[200px] rounded py-0 text-[11px]"
          />
          <button
            type="button"
            onClick={applySearch}
            className="shrink-0 rounded border border-[var(--card-border)] bg-white px-2 py-1 text-[10px] font-medium hover:bg-[var(--background)]"
          >
            Search
          </button>
        </div>
        {/* Right: Filters — inline on lg, dropdown on small */}
        <div className="flex items-center gap-1.5">
          <div className="hidden flex-wrap items-center gap-x-1.5 gap-y-1 lg:flex">
            {filterSelects}
          </div>
          <div className="relative lg:hidden" ref={filtersRef}>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 gap-1 px-2 text-[10px]"
              onClick={(e) => { e.stopPropagation(); setFiltersOpen((o) => !o); }}
              aria-expanded={filtersOpen}
            >
              <Filter className="size-3" />
              Filters
              {hasActiveFilters(filterState) ? " •" : ""}
            </Button>
            {filtersOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-1 w-[280px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-2 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-1 gap-2">
                  {filterSelects}
                </div>
                {hasActiveFilters(filterState) && (
                  <Button variant="secondary" size="sm" className="mt-2 h-6 w-full text-[10px]" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
          {hasActiveFilters(filterState) && (
            <Button variant="secondary" size="sm" className="hidden h-6 shrink-0 px-2 text-[10px] lg:inline-flex" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
