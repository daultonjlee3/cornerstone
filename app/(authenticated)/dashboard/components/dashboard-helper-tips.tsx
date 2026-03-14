"use client";

import Link from "next/link";
import { HelperTip } from "@/src/components/ui/helper-tip";

type Props = {
  overdueWorkOrders: number;
};

/** Rule-based helper tips for the dashboard. Deterministic, from real data. */
export function DashboardHelperTips({ overdueWorkOrders }: Props) {
  if (overdueWorkOrders <= 0) return null;

  return (
    <HelperTip
      id="helper-tip-dashboard-overdue"
      message="You have overdue work orders."
      action={
        <Link href="/work-orders?view=overdue" className="text-[var(--accent)] hover:underline">
          View overdue →
        </Link>
      }
    />
  );
}
