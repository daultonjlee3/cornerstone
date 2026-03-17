/**
 * Canonical work order status and lifecycle.
 * Single source of truth for status values, legacy mapping, and allowed transitions.
 * Use in server actions, dashboard queries, and UI so counts and transitions stay consistent.
 */

/** Legacy DB/API values that map to canonical statuses. */
export const LEGACY_STATUS_MAP: Record<string, string> = {
  open: "new",
  assigned: "ready_to_schedule",
  closed: "completed",
};

/** All status values that may appear in the system (canonical + legacy). */
export const ALL_SUPPORTED_STATUSES = [
  "draft",
  "open",
  "assigned",
  "closed",
  "new",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
] as const;

/** Statuses after which no further transitions are allowed. */
export const TERMINAL_STATUSES = new Set<string>(["completed", "cancelled", "closed"]);

/** Allowed transitions: from status -> Set of valid next statuses. */
export const TRANSITIONS: Record<string, ReadonlySet<string>> = {
  draft: new Set(["new", "cancelled"]),
  new: new Set(["ready_to_schedule", "scheduled", "in_progress", "on_hold", "cancelled"]),
  ready_to_schedule: new Set(["new", "scheduled", "in_progress", "on_hold", "cancelled"]),
  scheduled: new Set(["ready_to_schedule", "in_progress", "on_hold", "cancelled"]),
  in_progress: new Set(["on_hold", "completed", "cancelled"]),
  on_hold: new Set(["ready_to_schedule", "scheduled", "in_progress", "cancelled"]),
  completed: new Set(["completed"]),
  cancelled: new Set(["cancelled"]),
};

/**
 * Normalize status to canonical form (e.g. open -> new, assigned -> ready_to_schedule, closed -> completed).
 */
export function normalizeStatus(input: string | null | undefined): string {
  const value = (input ?? "").trim();
  if (!value) return "new";
  return LEGACY_STATUS_MAP[value] ?? value;
}

/**
 * Status used for transition checks; draft is treated as new.
 */
export function toComparableStatus(input: string | null | undefined): string {
  const value = normalizeStatus(input);
  return value === "draft" ? "new" : value;
}

/**
 * Whether a transition from current to target is allowed.
 */
export function canTransitionStatus(
  currentRaw: string | null | undefined,
  targetRaw: string
): boolean {
  const current = toComparableStatus(currentRaw);
  const target = toComparableStatus(targetRaw);
  const allowed = TRANSITIONS[current] ?? new Set();
  return allowed.has(target);
}

/**
 * Whether the value is a supported status (canonical or legacy).
 */
export function isSupportedStatus(input: string | null | undefined): boolean {
  if (!input) return false;
  return (ALL_SUPPORTED_STATUSES as readonly string[]).includes(input);
}

/**
 * Whether the status is terminal (completed, cancelled, or closed).
 */
export function isTerminalStatus(status: string | null | undefined): boolean {
  return TERMINAL_STATUSES.has(normalizeStatus(status));
}

/**
 * Statuses that count as "open" for dashboards and filters (not completed/cancelled/closed).
 */
export const OPEN_WORK_ORDER_STATUSES: readonly string[] = [
  "new",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "on_hold",
  "draft",
];

/**
 * Open statuses used for KPI counts (excludes draft). Use for dashboard/open work order queries.
 */
export const OPEN_ACTIVE_STATUSES: readonly string[] = [
  "new",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "on_hold",
];

/** Terminal statuses as array for Supabase .not("status", "in", "(...)") style queries. */
export const TERMINAL_STATUSES_ARRAY: readonly string[] = ["completed", "cancelled", "closed"];
