/**
 * Shared date helpers for server-side use (dashboard, notifications, reports).
 * Use for consistent YYYY-MM-DD from Date in UTC.
 */

/** Return date as YYYY-MM-DD (UTC). */
export function dateOnlyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today as YYYY-MM-DD (UTC). */
export function todayISOUTC(): string {
  return dateOnlyUTC(new Date());
}
