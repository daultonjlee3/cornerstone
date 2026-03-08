"use client";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";

type WorkOrderLocationCardProps = {
  workOrder: Record<string, unknown>;
};

function Row({ label, value, prominent }: { label: string; value: string | null | undefined; prominent?: boolean }) {
  const val = value ?? "—";
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className={`text-sm ${prominent ? "font-medium text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
        {val}
      </dd>
    </div>
  );
}

export function WorkOrderLocationCard({ workOrder }: WorkOrderLocationCardProps) {
  const assetName = (workOrder.asset_name as string) ?? null;
  const hasAsset = !!assetName;

  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Location & asset</h2>
      <dl className="space-y-3 text-sm">
        <Row label="Property" value={workOrder.property_name as string} />
        <Row label="Building" value={workOrder.building_name as string} />
        <Row label="Unit" value={workOrder.unit_name as string} />
        {hasAsset && (
          <div className="rounded border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
            <Row label="Asset" value={assetName} prominent />
          </div>
        )}
        {!hasAsset && <Row label="Asset" value={null} />}
      </dl>
    </div>
  );
}
