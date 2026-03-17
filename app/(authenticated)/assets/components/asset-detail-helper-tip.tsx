"use client";

import Link from "next/link";
import { HelperTip } from "@/src/components/ui/helper-tip";

type Props = {
  /** Asset has 2+ completed repair/emergency work orders in last 30 days. */
  repeatedRepairs: boolean;
  /** Asset has no linked PM plans. */
  noPmPlans: boolean;
};

/** Rule-based helper tip for asset detail: suggest PM when repeated repairs. */
export function AssetDetailHelperTip({ repeatedRepairs, noPmPlans }: Props) {
  if (!repeatedRepairs || !noPmPlans) return null;

  return (
    <HelperTip
      id="helper-tip-asset-repeated-repairs"
      message="This asset has repeated repairs. Consider a PM schedule."
      action={
        <Link href="/preventive-maintenance" className="text-[var(--accent)] hover:underline">
          Preventive Maintenance →
        </Link>
      }
    />
  );
}
