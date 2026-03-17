// Re-export shared formatters from the central date-utils so work-orders
// components can import from here or directly from src/lib/date-utils.
export { formatDate, formatDateTime } from "@/src/lib/date-utils";

export const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
export const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";
export const labelClass = "text-[var(--muted)]";
export const valueClass = "text-[var(--foreground)]";
