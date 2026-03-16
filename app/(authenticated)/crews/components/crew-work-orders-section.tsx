"use client";

import Link from "next/link";
import { formatDate } from "@/src/lib/date-utils";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";

type WorkOrderRow = {
  id: string;
  work_order_number: string | null;
  title: string;
  status: string;
  priority?: string | null;
  scheduled_date: string | null;
  updated_at: string;
  location?: string;
};

type CrewWorkOrdersSectionProps = {
  workOrders: WorkOrderRow[];
};

export function CrewWorkOrdersSection({ workOrders }: CrewWorkOrdersSectionProps) {
  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Assigned work orders</h2>
      {workOrders.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No work orders assigned to this crew.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="py-2 text-left font-medium text-[var(--muted)]">Work order</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Title</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Status</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Priority</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Scheduled</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Location</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Updated</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <tr key={wo.id} className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--background)]/50">
                  <td className="py-2">
                    <Link href={`/work-orders/${wo.id}`} className="font-medium text-[var(--accent)] hover:underline">
                      {wo.work_order_number ?? wo.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-2 text-[var(--foreground)]">{wo.title}</td>
                  <td className="py-2">
                    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-[var(--muted)]/20 text-[var(--muted)]">
                      {wo.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2 text-[var(--muted)] capitalize">{wo.priority ?? "—"}</td>
                  <td className="py-2 text-[var(--muted)]">{formatDate(wo.scheduled_date)}</td>
                  <td className="py-2 text-[var(--muted)] max-w-[140px] truncate" title={wo.location}>{wo.location ?? "—"}</td>
                  <td className="py-2 text-[var(--muted)]">{formatDate(wo.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
