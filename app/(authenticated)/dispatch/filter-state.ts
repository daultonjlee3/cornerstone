/**
 * Single source of truth for dispatch filter state.
 * Parsed from URL search params (server + client) and serialized back for navigation.
 */

export type DispatchViewMode = "day" | "week" | "month";

export type DispatchFilterState = {
  search: string;
  companyId: string;
  propertyId: string;
  priority: string;
  status: string;
  crewId: string;
  technicianId: string;
  category: string;
  viewMode: DispatchViewMode;
  selectedDate: string; // YYYY-MM-DD
};

const DEFAULT_FILTER_STATE: DispatchFilterState = {
  search: "",
  companyId: "",
  propertyId: "",
  priority: "",
  status: "",
  crewId: "",
  technicianId: "",
  category: "",
  viewMode: "day",
  selectedDate: "",
};

/** Parse YYYY-MM-DD and return same string if valid; otherwise null. */
export function parseDateSafe(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(trimmed + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return trimmed;
}

/** Today in YYYY-MM-DD (local date). */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse filter state from URL search params (e.g. from Next.js page). */
export function parseFilterStateFromParams(
  params: Record<string, string | string[] | undefined> | null | undefined
): DispatchFilterState {
  const p = params ?? {};
  const get = (key: string): string => {
    const v = p[key];
    if (v == null) return "";
    return typeof v === "string" ? v.trim() : Array.isArray(v) ? (v[0] as string)?.trim() ?? "" : "";
  };

  const viewParam = get("view");
  const viewMode: DispatchViewMode =
    viewParam === "week" || viewParam === "month" ? viewParam : "day";

  const dateParam = get("date");
  const selectedDate = parseDateSafe(dateParam) ?? todayISO();

  return {
    search: get("q"),
    companyId: get("company_id"),
    propertyId: get("property_id"),
    priority: get("priority"),
    status: get("status"),
    crewId: get("crew_id"),
    technicianId: get("technician_id"),
    category: get("category"),
    viewMode,
    selectedDate,
  };
}

/** Serialize filter state to URL search params (only non-empty values). */
export function filterStateToParams(state: DispatchFilterState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("date", state.selectedDate);
  params.set("view", state.viewMode);
  if (state.search) params.set("q", state.search);
  if (state.companyId) params.set("company_id", state.companyId);
  if (state.propertyId) params.set("property_id", state.propertyId);
  if (state.priority) params.set("priority", state.priority);
  if (state.status) params.set("status", state.status);
  if (state.crewId) params.set("crew_id", state.crewId);
  if (state.technicianId) params.set("technician_id", state.technicianId);
  if (state.category) params.set("category", state.category);
  return params;
}

/** Empty filter state with today's date and day view. */
export function getDefaultFilterState(): DispatchFilterState {
  return {
    ...DEFAULT_FILTER_STATE,
    selectedDate: todayISO(),
    viewMode: "day",
  };
}

/** Whether any filter (other than date/view) is active. */
export function hasActiveFilters(state: DispatchFilterState): boolean {
  return !!(
    state.search ||
    state.companyId ||
    state.propertyId ||
    state.priority ||
    state.status ||
    state.crewId ||
    state.technicianId ||
    state.category
  );
}
