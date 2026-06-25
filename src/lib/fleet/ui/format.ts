/** Shared fleet display formatting — single source for currency, distance, etc. */

export function formatFleetCurrency(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

export function formatFleetPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatFleetMiles(value: number): string {
  return `${value.toFixed(1)} mi`;
}

export function formatFleetHours(value: number): string {
  return `${value.toFixed(1)}h`;
}

export function formatDataFreshness(iso: string | null | undefined): string {
  if (!iso) return "Unknown freshness";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "Just updated";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}
