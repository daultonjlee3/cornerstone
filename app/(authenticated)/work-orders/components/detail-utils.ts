export function formatDateTime(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function formatDate(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

export const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
export const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";
export const labelClass = "text-[var(--muted)]";
export const valueClass = "text-[var(--foreground)]";
