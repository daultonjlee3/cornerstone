"use client";

type Props = {
  partsTotal: number;
  actualHours?: number | null;
  laborMinutes?: number | null;
  vendorCost?: number | null;
};

function currency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

const cardClass =
  "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const labelClass = "text-xs font-medium text-[var(--muted)]";
const valueClass = "text-sm text-[var(--foreground)]";

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const normalized = Math.max(0, Math.round(minutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

export function WorkOrderCostSummary({ partsTotal, actualHours, laborMinutes, vendorCost }: Props) {
  const total = (partsTotal || 0) + (vendorCost || 0);
  return (
    <div className={cardClass}>
      <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
        Cost Summary
      </h2>
      <dl className="space-y-3">
        <div>
          <dt className={labelClass}>Parts total</dt>
          <dd className={valueClass}>{currency(partsTotal || 0)}</dd>
        </div>
        <div>
          <dt className={labelClass}>Actual hours</dt>
          <dd className={valueClass}>
            {actualHours != null ? Number(actualHours).toFixed(2) : "—"}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Labor time</dt>
          <dd className={valueClass}>{formatDuration(laborMinutes)}</dd>
        </div>
        <div>
          <dt className={labelClass}>Vendor cost</dt>
          <dd className={valueClass}>{currency(vendorCost || 0)}</dd>
        </div>
        <div>
          <dt className={labelClass}>Total direct cost</dt>
          <dd className={valueClass}>{currency(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
