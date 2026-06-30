"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  DollarSign,
  Route,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type {
  FleetRecommendationHistoryEntry,
  FleetRecommendationTrustDashboard,
} from "@/src/types/fleet";
import { PageHeader } from "@/src/components/ui/page-header";
import { MetricCard } from "@/src/components/ui/metric-card";
import { StatusChip } from "@/src/components/design-system";
import {
  confidenceLabel,
  formatRecommendationType,
} from "@/app/(authenticated)/operations/components/fleet-recommendation-utils";

function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(0)}%`;
}

function outcomeLabel(entry: FleetRecommendationHistoryEntry): string {
  switch (entry.status) {
    case "accepted":
    case "applied":
      return "Accepted";
    case "completed":
      return "Completed";
    case "dismissed":
      return "Rejected";
    case "expired":
      return "Expired";
    case "failed":
      return "Failed";
    default:
      return entry.status;
  }
}

function outcomeTone(
  entry: FleetRecommendationHistoryEntry
): "success" | "warning" | "danger" | "neutral" {
  if (entry.status === "completed" || entry.status === "applied") return "success";
  if (entry.status === "dismissed" || entry.status === "failed") return "danger";
  if (entry.status === "expired") return "warning";
  return "neutral";
}

type RecommendationTrustDashboardViewProps = {
  dashboard: FleetRecommendationTrustDashboard;
};

export function RecommendationTrustDashboardView({
  dashboard,
}: RecommendationTrustDashboardViewProps) {
  const { totals, rates, estimatedImpact, measuredOutcomes, recentHistory, trustScore } = dashboard;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recommendation Trust"
        subtitle="Track recommendation outcomes, measured impact, and dispatcher confidence over time."
        iconLucide={ShieldCheck}
        actions={
          <Link
            href="/dispatch"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Sparkles className="h-4 w-4" />
            Open Dispatch
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Trust score"
          value={trustScore != null ? `${Math.round(trustScore)}` : "—"}
          icon={ShieldCheck}
          description="Acceptance, application success, and measured outcomes"
        />
        <MetricCard
          title="Acceptance rate"
          value={formatPct(rates.acceptanceRate)}
          icon={CheckCircle2}
          description={`${totals.accepted} accepted / ${totals.accepted + totals.rejected} acted on`}
        />
        <MetricCard
          title="Est. contribution protected"
          value={formatCurrency(estimatedImpact.contributionImprovement)}
          icon={DollarSign}
          description="From accepted recommendations (estimated)"
        />
        <MetricCard
          title="Measured contribution"
          value={formatCurrency(measuredOutcomes.totalMeasuredContribution)}
          icon={TrendingUp}
          description={`${measuredOutcomes.measuredCount} jobs with measured outcomes`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold text-neutral-900">Decision volume</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600">Accepted</dt>
              <dd className="font-medium text-neutral-900">{totals.accepted}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Rejected</dt>
              <dd className="font-medium text-neutral-900">{totals.rejected}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Expired</dt>
              <dd className="font-medium text-neutral-900">{totals.expired}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Applied to jobs</dt>
              <dd className="font-medium text-neutral-900">{totals.applied}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Completed & measured</dt>
              <dd className="font-medium text-neutral-900">{totals.completed}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Failed</dt>
              <dd className="font-medium text-neutral-900">{totals.failed}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-neutral-900">Estimated impact (period)</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Revenue protected</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {formatCurrency(estimatedImpact.revenueProtected)}
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Deadhead reduction</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {estimatedImpact.deadheadReduction.toFixed(1)} mi
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Overtime avoided</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {formatCurrency(estimatedImpact.overtimeAvoided)}
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Time savings</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {estimatedImpact.travelTimeSavedMinutes} min
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Labor saved</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {formatCurrency(estimatedImpact.laborSaved)}
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">On-time completion</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {formatPct(measuredOutcomes.onTimeCompletionRate)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Recommendation history</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Previous decisions with financial estimates and measured outcomes where available.
          </p>
        </div>
        <div className="divide-y divide-neutral-100">
          {recentHistory.length === 0 ? (
            <p className="px-5 py-8 text-sm text-neutral-500">
              No recommendation history yet. Accept or reject recommendations on the dispatch board to
              build trust metrics.
            </p>
          ) : (
            recentHistory.map((entry) => {
              const trust = entry.trust;
              return (
                <article key={entry.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip label={outcomeLabel(entry)} tone={outcomeTone(entry)} />
                        <span className="text-xs text-neutral-500">
                          {formatRecommendationType(entry.recommendation_type)}
                        </span>
                        {trust ? (
                          <span className="text-xs font-medium text-primary-700">
                            {confidenceLabel(trust.confidenceLabel)} confidence ({trust.confidenceScore})
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 font-medium text-neutral-900">{entry.rationale.title}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                    {trust?.financialImpact != null ? (
                      <p className="text-sm font-semibold text-emerald-700">
                        {formatCurrency(trust.financialImpact)} impact
                      </p>
                    ) : null}
                  </div>

                  {trust ? (
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Why this recommendation
                        </p>
                        <ul className="mt-1 list-inside list-disc text-sm text-neutral-700">
                          {trust.whyThisRecommendation.slice(0, 3).map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <Route className="h-3.5 w-3.5 shrink-0" />
                          Deadhead −{trust.deadheadReductionMiles ?? 0} mi
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <Clock3 className="h-3.5 w-3.5 shrink-0" />
                          {trust.timeSavingsMinutes ?? 0} min saved
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <DollarSign className="h-3.5 w-3.5 shrink-0" />
                          OT {formatCurrency(trust.overtimeImpact)}
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                          Rev {formatCurrency(trust.revenueProtected)}
                        </div>
                      </div>
                      {trust.alternativeOptions.length > 0 ? (
                        <div className="lg:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Alternatives considered
                          </p>
                          <p className="mt-1 text-sm text-neutral-700">
                            {trust.alternativeOptions
                              .map((alt) => `${alt.unit_number} (${alt.score})`)
                              .join(" · ")}
                          </p>
                        </div>
                      ) : null}
                      {trust.risks.length > 0 ? (
                        <div className="lg:col-span-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{trust.risks[0]}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
