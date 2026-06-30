"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type {
  FleetRecommendationSummary,
  FleetRecommendationsResponse,
} from "@/src/types/fleet";

type FleetDispatchTrustStripProps = {
  summary?: FleetRecommendationSummary;
  trustMetrics?: FleetRecommendationsResponse["trustMetrics"];
  compact?: boolean;
};

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function FleetDispatchTrustStrip({
  summary,
  trustMetrics,
  compact = false,
}: FleetDispatchTrustStripProps) {
  const acceptanceRate = trustMetrics?.rates.acceptanceRate ?? summary?.acceptanceRate ?? null;
  const trustScore = trustMetrics?.trustScore ?? summary?.trustScore ?? null;
  const measuredCount = trustMetrics?.measuredOutcomes.measuredCount ?? 0;
  const measuredContribution = trustMetrics?.measuredOutcomes.totalMeasuredContribution ?? 0;
  const acted = (summary?.accepted ?? 0) + (summary?.rejected ?? summary?.dismissed ?? 0);

  if (acted === 0 && trustScore == null) {
    return null;
  }

  const className = compact
    ? "dispatch-console__trust-strip dispatch-console__trust-strip--compact"
    : "dispatch-mission__trust-strip";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)]">
          <ShieldCheck className="size-3.5 text-[var(--brand-operational)]" aria-hidden />
          Trust {trustScore != null ? `${Math.round(trustScore)}` : "—"}
        </span>
        <span>Accepted {formatPct(acceptanceRate)}</span>
        {measuredCount > 0 ? (
          <span>
            {measuredCount} measured · {formatCurrency(measuredContribution)} actual
          </span>
        ) : (
          <span>No measured outcomes yet</span>
        )}
      </div>
      <Link
        href="/fleet/recommendations"
        className="text-xs font-medium text-[var(--brand-operational)] hover:underline"
      >
        View history
      </Link>
    </div>
  );
}
