/**
 * Shared date and formatting helpers.
 * Used by server components (dashboard, notifications, reports) and client components alike.
 */

// ─── UTC date utilities ───────────────────────────────────────────────────────

/** Return date as YYYY-MM-DD (UTC). */
export function dateOnlyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today as YYYY-MM-DD (UTC). */
export function todayISOUTC(): string {
  return dateOnlyUTC(new Date());
}

// ─── Display formatters ───────────────────────────────────────────────────────
// These were previously copy-pasted as inline functions across 12+ files.
// Single source of truth here; import from "@/src/lib/date-utils" everywhere.

/** Format an ISO timestamp as a short locale date string. Returns "—" for null/empty. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

/** Format an ISO timestamp as a short locale date + time string. Returns "—" for null/empty. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}
