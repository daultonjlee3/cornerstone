"use client";

import Link from "next/link";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";

type WorkOrderLocationCardProps = {
  workOrder: Record<string, unknown>;
};

function Row({ label, value, prominent }: { label: string; value: React.ReactNode; prominent?: boolean }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className={`text-sm ${prominent ? "font-medium text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

export function WorkOrderLocationCard({ workOrder }: WorkOrderLocationCardProps) {
  const workOrderId = (workOrder.id as string) ?? "";
  const assetId = (workOrder.asset_id as string) ?? null;
  const assetName = (workOrder.asset_name as string) ?? null;
  const hasAsset = !!(assetId || assetName);

  return (
    <div
      data-demo-scenario-target="work-order-asset-card"
      data-work-order-id={workOrderId}
      className={cardClass}
    >
      <h2 className={cardTitleClass}>Location & asset</h2>
      <dl className="space-y-3 text-sm">
        <Row label="Property" value={workOrder.property_name as string} />
        <Row label="Building" value={workOrder.building_name as string} />
        <Row label="Unit" value={workOrder.unit_name as string} />
        {hasAsset && (
          <div className="rounded border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
            <Row
              label="Asset"
              value={
                assetId ? (
                  <Link
                    href={`/assets/${assetId}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {assetName || "View asset"}
                  </Link>
                ) : (
                  assetName
                )
              }
              prominent
            />
          </div>
        )}
        {!hasAsset && <Row label="Asset" value={null} />}
      </dl>
    </div>
  );
}
