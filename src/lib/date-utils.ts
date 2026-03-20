/**
 * Shared date and formatting helpers.
 * Used by server components (dashboard, notifications, reports) and client components alike.
 */

// ─── UTC date utilities ───────────────────────────────────────────────────────

/** Return date as YYYY-MM-DD (UTC). */
export function dateOnlyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Normalize Postgres/Supabase date or timestamptz strings to YYYY-MM-DD for comparisons
 * (e.g. with dispatch filter `selectedDate`). Avoids `"2026-03-19T00:00:00" === "2026-03-19"` false negatives.
 */
export function toDateOnlyString(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return dateOnlyUTC(d);
  } catch {
    return null;
  }
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
