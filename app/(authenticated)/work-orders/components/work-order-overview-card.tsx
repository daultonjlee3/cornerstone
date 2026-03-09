"use client";

import Link from "next/link";
import { formatDateTime } from "./detail-utils";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";
const dlItem = "space-y-1";

type WorkOrderOverviewCardProps = {
  workOrder: Record<string, unknown>;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={dlItem}>
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className="text-sm text-[var(--foreground)]">{value ?? "—"}</dd>
    </div>
  );
}

export function WorkOrderOverviewCard({ workOrder }: WorkOrderOverviewCardProps) {
  const requestedBy = [workOrder.requested_by_name, workOrder.requested_by_email]
    .filter(Boolean)
    .join(" • ") || null;
  const nte = workOrder.nte_amount != null ? `$${Number(workOrder.nte_amount).toFixed(2)}` : null;
  const sourceType = (workOrder.source_type as string | null) ?? null;
  const pmPlanId = (workOrder.preventive_maintenance_plan_id as string | null) ?? null;

  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Overview</h2>
      <dl className="space-y-3 text-sm">
        <Row label="Company" value={workOrder.company_name as string} />
        <Row label="Customer" value={workOrder.customer_name as string} />
        <Row label="Requested by" value={requestedBy} />
        <Row label="Requested at" value={formatDateTime(workOrder.requested_at as string)} />
        <Row
          label="Source"
          value={
            sourceType === "preventive_maintenance" ? (
              pmPlanId ? (
                <Link href={`/preventive-maintenance/${pmPlanId}`} className="text-[var(--accent)] hover:underline">
                  Preventive maintenance
                </Link>
              ) : (
                "Preventive maintenance"
              )
            ) : (
              "Manual"
            )
          }
        />
        <Row
          label="Billable"
          value={workOrder.billable ? "Yes" : "No"}
        />
        {nte && <Row label="Not-to-exceed amount" value={nte} />}
      </dl>
      {(workOrder.description as string) && (
        <div className="mt-4 border-t border-[var(--card-border)] pt-4">
          <dt className="text-xs font-medium text-[var(--muted)]">Description</dt>
          <dd className="mt-1 text-sm text-[var(--foreground)] whitespace-pre-wrap">
            {workOrder.description as string}
          </dd>
        </div>
      )}
    </div>
  );
}
