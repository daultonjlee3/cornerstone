"use client";

type Props = {
  partsTotal: number;
  actualHours?: number | null;
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

export function WorkOrderCostSummary({ partsTotal, actualHours }: Props) {
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
      </dl>
    </div>
  );
}
