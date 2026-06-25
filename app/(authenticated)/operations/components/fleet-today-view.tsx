"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  Percent,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Truck,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import type {
  FleetMetricDelta,
  FleetOperationalException,
  FleetTodayViewData,
} from "@/src/types/fleet";
import {
  FleetEmptyState,
  FleetKpi,
  FleetPanel,
  FleetRecommendationCard,
  FleetSectionHeader,
  FleetStatusChip,
} from "@/src/components/fleet/ui";
import { formatFleetCurrency } from "@/src/lib/fleet/ui/format";
import {
  fleetPanelSeverityClass,
  severityToFleetSeverity,
} from "@/src/lib/fleet/ui/severity";

type FleetTodayViewProps = {
  initialData: FleetTodayViewData;
};

function formatDeltaValue(delta: FleetMetricDelta): string {
  const { today, format } = delta;
  if (today == null) return "—";
  switch (format) {
    case "percent":
      return `${today.toFixed(1)}%`;
    case "currency":
      return formatFleetCurrency(today);
    case "hours":
      return `${today.toFixed(1)}h`;
    case "miles":
      return `${today.toFixed(1)} mi`;
    default:
      return String(Math.round(today));
  }
}

function DeltaIcon({ direction }: { direction: FleetMetricDelta["direction"] }) {
  if (direction === "improved") return <TrendingUp className="size-3.5 text-[var(--success)]" />;
  if (direction === "declined") return <TrendingDown className="size-3.5 text-[var(--danger)]" />;
  if (direction === "unchanged") return <Minus className="size-3.5 text-[var(--muted)]" />;
  return null;
}

export function FleetTodayView({ initialData }: FleetTodayViewProps) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/fleet/today-view", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as FleetTodayViewData;
    setData(payload);
    setError(null);
  }, []);

  const onRecommendationAction = useCallback(
    (id: string, action: "accept" | "dismiss") => {
      setError(null);
      startTransition(async () => {
        const res = await fetch(`/api/fleet/recommendations/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          setError(action === "accept" ? "Unable to accept recommendation." : "Unable to dismiss recommendation.");
          return;
        }
        await refresh();
      });
    },
    [refresh]
  );

  const cc = data.commandCenter;
  const criticalCount = data.exceptions.filter((e) => e.severity === "critical").length;
  const primaryRec = data.recommendations.pending[0];
  const secondaryRecs = data.recommendations.pending.slice(1);

  return (
    <div className="space-y-8" data-testid="fleet-today-view">
      {/* Mission header */}
      <FleetPanel variant="elevated" className="p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="fleet-eyebrow">Fleet Command Center</p>
            </div>
            <p className="max-w-3xl text-base leading-relaxed text-[var(--muted-strong)]">
              {data.executiveSummary}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <FleetStatusChip
                label={`${data.pendingActionCount} need attention`}
                severity={data.pendingActionCount > 0 ? "warning" : "success"}
              />
              {criticalCount > 0 ? (
                <FleetStatusChip label={`${criticalCount} critical`} severity="critical" />
              ) : null}
              <span className="text-xs text-[var(--muted)]">{data.date}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link href="/dispatch">Dispatch Intelligence</Link>
            </Button>
            <Button type="button" size="sm" onClick={() => void refresh()} disabled={pending}>
              Refresh
            </Button>
          </div>
        </div>
      </FleetPanel>

      {/* Operational pulse */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <FleetKpi
          label="Contribution today"
          value={
            cc.estimatedContributionToday != null
              ? formatFleetCurrency(cc.estimatedContributionToday)
              : "—"
          }
          hint="Operational margin"
          icon={DollarSign}
          emphasis={cc.estimatedContributionToday != null && cc.estimatedContributionToday >= 0 ? "success" : "default"}
        />
        <FleetKpi
          label="Utilization"
          value={cc.utilizationPercent != null ? `${cc.utilizationPercent.toFixed(1)}%` : "—"}
          hint="Billable today"
          icon={Percent}
        />
        <FleetKpi
          label="Live on GPS"
          value={cc.activeTrucks}
          hint="Active trucks"
          icon={Truck}
          emphasis="success"
        />
        <FleetKpi
          label="Needs attention"
          value={cc.idleTrucks}
          hint="Stale or offline"
          icon={Clock}
          emphasis={cc.idleTrucks > 0 ? "warning" : "default"}
        />
        <FleetKpi
          label="Jobs today"
          value={cc.jobsToday}
          hint={`${cc.unassignedJobs} unassigned`}
          icon={ClipboardList}
          emphasis={cc.unassignedJobs > 0 ? "warning" : "default"}
        />
        <FleetKpi
          label="Pending decisions"
          value={data.recommendations.pending.length}
          hint="Recommendations"
          icon={Sparkles}
          emphasis={data.recommendations.pending.length > 0 ? "info" : "default"}
        />
      </div>

      {error ? (
        <p className="fleet-panel border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.06)] px-4 py-3 text-sm text-[#fca5a5]">
          {error}
        </p>
      ) : null}

      {/* Decision-first: recommendations + operational signals */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section id="fleet-recommendations" className="scroll-mt-6 space-y-4 lg:col-span-7">
          <FleetSectionHeader
            eyebrow="Priority 1"
            title="Recommended actions"
            description="Accept or dismiss — each recommendation includes contribution and travel impact."
            action={
              data.recommendations.pending.length > 0 ? (
                <FleetStatusChip
                  label={`${data.recommendations.pending.length} pending`}
                  severity="info"
                />
              ) : null
            }
          />
          {primaryRec ? (
            <FleetRecommendationCard
              recommendation={primaryRec}
              onAction={onRecommendationAction}
              pending={pending}
              variant="hero"
            />
          ) : (
            <FleetPanel className="p-0">
              <FleetEmptyState
                icon={<CheckCircle2 className="size-8 text-[var(--success)]" />}
                title="No pending recommendations"
                description="Fleet is operating within normal parameters. Check exceptions or refresh after dispatch changes."
                action={
                  <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
                    Refresh briefing
                  </Button>
                }
              />
            </FleetPanel>
          )}
          {secondaryRecs.length > 0 ? (
            <ul className="space-y-3">
              {secondaryRecs.map((rec) => (
                <li key={rec.id}>
                  <FleetRecommendationCard
                    recommendation={rec}
                    onAction={onRecommendationAction}
                    pending={pending}
                    variant="compact"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section id="fleet-exceptions" className="scroll-mt-6 space-y-4 lg:col-span-5">
          <FleetSectionHeader
            eyebrow="Operational health"
            title="Exceptions & alerts"
            description="Issues that need attention before they become costly."
            action={
              criticalCount > 0 ? (
                <FleetStatusChip label={`${criticalCount} critical`} severity="critical" />
              ) : null
            }
          />
          {data.exceptions.length === 0 ? (
            <FleetPanel className="p-0">
              <FleetEmptyState
                icon={<CheckCircle2 className="size-8 text-[var(--success)]" />}
                title="All clear"
                description="No operational exceptions detected for today."
              />
            </FleetPanel>
          ) : (
            <ul className="space-y-2">
              {data.exceptions.map((ex) => (
                <ExceptionRow key={ex.id} exception={ex} />
              ))}
            </ul>
          )}

          {data.revenueAtRisk > 0 ? (
            <FleetPanel className="flex flex-wrap items-center gap-3 border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.04)] p-4">
              <AlertTriangle className="size-4 shrink-0 text-[var(--warning)]" />
              <p className="min-w-0 flex-1 text-sm text-[var(--foreground)]">
                <strong>{formatFleetCurrency(data.revenueAtRisk)}</strong> revenue at risk from unassigned jobs
              </p>
              <Button type="button" size="sm" asChild>
                <Link href="/dispatch">Dispatch now</Link>
              </Button>
            </FleetPanel>
          ) : null}

          {data.integrationHealth.length > 0 ? (
            <div className="space-y-2 pt-2">
              <p className="fleet-kpi-label">Integrations</p>
              <div className="flex flex-wrap gap-2">
                {data.integrationHealth.map((conn) => (
                  <Link key={conn.id} href="/settings/integrations">
                    <FleetStatusChip
                      label={`${conn.displayName} · ${conn.status}`}
                      severity={
                        conn.status === "healthy"
                          ? "success"
                          : conn.status === "error"
                            ? "critical"
                            : "warning"
                      }
                    />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {/* Profit snapshot */}
      {data.executiveInsights ? (
        <section className="space-y-4" data-testid="fleet-executive-insights">
          <FleetSectionHeader
            eyebrow="Financial impact"
            title="Operational profit snapshot"
            description="Where contribution is created — and where it is leaking today."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FleetKpi
              label="Today's contribution"
              value={formatFleetCurrency(data.executiveInsights.todaysContribution)}
              hint="From utilization mart"
              icon={DollarSign}
              emphasis={data.executiveInsights.todaysContribution >= 0 ? "success" : "critical"}
            />
            <FleetKpi
              label="Contribution at risk"
              value={formatFleetCurrency(data.executiveInsights.contributionAtRisk)}
              hint="Unassigned jobs"
              icon={AlertTriangle}
              emphasis={data.executiveInsights.contributionAtRisk > 0 ? "critical" : "default"}
            />
            <FleetKpi
              label="Best branch"
              value={data.executiveInsights.highestPerformingBranch?.branch_name ?? "—"}
              hint={
                data.executiveInsights.highestPerformingBranch
                  ? `${formatFleetCurrency(data.executiveInsights.highestPerformingBranch.contribution)} contribution`
                  : "No mart data"
              }
              icon={TrendingUp}
            />
            <FleetKpi
              label="Largest cost leak"
              value={formatFleetCurrency(data.executiveInsights.largestCostLeak.amount)}
              hint={data.executiveInsights.largestCostLeak.label}
              icon={TrendingDown}
              emphasis={data.executiveInsights.largestCostLeak.amount > 0 ? "warning" : "default"}
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {data.executiveInsights.mostProfitableTruck ? (
              <FleetPanel className="px-4 py-3">
                <p className="fleet-kpi-label">Most profitable truck</p>
                <p className="mt-1 font-semibold">{data.executiveInsights.mostProfitableTruck.unit_number}</p>
                <p className="text-xs text-[var(--muted)]">
                  {formatFleetCurrency(data.executiveInsights.mostProfitableTruck.contribution)} this week
                </p>
              </FleetPanel>
            ) : null}
            {data.executiveInsights.mostProfitableOperator ? (
              <FleetPanel className="px-4 py-3">
                <p className="fleet-kpi-label">Most profitable operator</p>
                <p className="mt-1 font-semibold">{data.executiveInsights.mostProfitableOperator.operator_name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {formatFleetCurrency(data.executiveInsights.mostProfitableOperator.contribution_generated)} this week
                </p>
              </FleetPanel>
            ) : null}
            <FleetPanel className="px-4 py-3">
              <p className="fleet-kpi-label">Recommendation value this week</p>
              <p className="mt-1 text-lg font-semibold">
                {formatFleetCurrency(data.executiveInsights.recommendationValueThisWeek)}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {data.executiveInsights.largestRecommendationOpportunity} pending recommendations
              </p>
            </FleetPanel>
          </div>
        </section>
      ) : null}

      {/* Changes + ROI */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <FleetSectionHeader title="Changes since yesterday" />
          <div className="grid gap-3 sm:grid-cols-2">
            {data.changesSinceYesterday.map((delta) => (
              <FleetPanel key={delta.key} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="fleet-kpi-label">{delta.label}</p>
                  <DeltaIcon direction={delta.direction} />
                </div>
                <p className="fleet-kpi-value mt-2 text-xl">{formatDeltaValue(delta)}</p>
                {delta.delta != null && delta.yesterday != null ? (
                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    {delta.direction === "improved"
                      ? "Improved"
                      : delta.direction === "declined"
                        ? "Declined"
                        : delta.direction === "unchanged"
                          ? "Unchanged"
                          : "—"}
                    {delta.deltaPercent != null && Math.abs(delta.deltaPercent) >= 0.1
                      ? ` · ${delta.deltaPercent > 0 ? "+" : ""}${delta.deltaPercent.toFixed(1)}%`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-[var(--muted)]">No prior-day comparison</p>
                )}
              </FleetPanel>
            ))}
          </div>
        </section>

        <section className="space-y-4" data-testid="fleet-recommendation-roi">
          <FleetSectionHeader
            eyebrow="Decision outcomes"
            title="Recommendation ROI"
            description="This week · estimated impact from accepted recommendations"
          />
          {data.recommendationRoi ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FleetKpi
                label="Accepted"
                value={data.recommendationRoi.accepted}
                hint={`${data.recommendationRoi.acceptanceRate?.toFixed(0) ?? "—"}% acceptance rate`}
              />
              <FleetKpi
                label="Contribution protected"
                value={formatFleetCurrency(data.recommendationRoi.contributionImprovement)}
                emphasis="success"
              />
              <FleetKpi
                label="Revenue protected"
                value={formatFleetCurrency(data.recommendationRoi.revenueProtected)}
              />
              <FleetKpi
                label="Applied / failed"
                value={`${data.recommendationRoi.applied} / ${data.recommendationRoi.failed}`}
                emphasis={data.recommendationRoi.failed > 0 ? "warning" : "default"}
              />
            </div>
          ) : (
            <FleetPanel className="p-0">
              <FleetEmptyState
                title="No outcomes yet"
                description="Accept recommendations to start measuring ROI this week."
              />
            </FleetPanel>
          )}
        </section>
      </div>

      {/* Capacity */}
      {(data.upcomingCapacityIssues.length > 0 || data.unusedCapacityBranches.length > 0) && (
        <section className="grid gap-4 lg:grid-cols-2">
          {data.upcomingCapacityIssues.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Upcoming capacity issues</CardTitle>
                <CardDescription>Branches approaching or over committed hours.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.upcomingCapacityIssues.slice(0, 5).map((b) => (
                  <Link
                    key={b.branch_id}
                    href={b.href}
                    className="flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--card-border)] px-3 py-2 text-sm transition hover:bg-[var(--card-elevated)]"
                  >
                    <span>{b.branch_name}</span>
                    <FleetStatusChip
                      label={`${Math.round(b.utilization * 100)}%`}
                      severity="warning"
                      showDot={false}
                    />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
          {data.unusedCapacityBranches.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Unused capacity</CardTitle>
                <CardDescription>Branches with room to absorb more work.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.unusedCapacityBranches.slice(0, 5).map((b) => (
                  <Link
                    key={b.branch_id}
                    href={b.href}
                    className="flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--card-border)] px-3 py-2 text-sm transition hover:bg-[var(--card-elevated)]"
                  >
                    <span>{b.branch_name}</span>
                    <FleetStatusChip
                      label={`${Math.round((1 - b.utilization) * 100)}% available`}
                      severity="success"
                      showDot={false}
                    />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </section>
      )}

      {/* Fleet health footer */}
      <section className="space-y-4 border-t border-[var(--card-border)] pt-8">
        <FleetSectionHeader
          title="Fleet health"
          description="Performance snapshot — full analysis in Fleet Performance report."
          action={
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link href="/reports/operations">
                Fleet Performance <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FleetKpi
            label="Revenue / truck MTD"
            value={
              cc.revenuePerTruckMtd != null ? formatFleetCurrency(cc.revenuePerTruckMtd) : "—"
            }
            hint={`${cc.truckCount} active trucks`}
            icon={DollarSign}
          />
          <FleetKpi label="Truck count" value={cc.truckCount} hint="Active fleet" icon={Truck} />
          <FleetKpi
            label="Unassigned jobs"
            value={cc.unassignedJobs}
            hint="Requires dispatch"
            icon={ClipboardList}
            emphasis={cc.unassignedJobs > 0 ? "warning" : "success"}
          />
        </div>
      </section>
    </div>
  );
}

function ExceptionRow({ exception: ex }: { exception: FleetOperationalException }) {
  const severity = severityToFleetSeverity(ex.severity);

  return (
    <li
      className={`fleet-panel px-4 py-3 ${fleetPanelSeverityClass(severity)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <FleetStatusChip label={ex.severity} severity={severity} />
            <p className="text-sm font-semibold text-[var(--foreground)]">{ex.title}</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{ex.whyItMatters}</p>
          <p className="mt-1 text-xs font-medium text-[var(--muted-strong)]">{ex.recommendedAction}</p>
        </div>
        <Button type="button" size="sm" variant="secondary" asChild>
          <Link href={ex.href}>
            Act <ArrowRight className="ml-1 size-3.5" />
          </Link>
        </Button>
      </div>
    </li>
  );
}
