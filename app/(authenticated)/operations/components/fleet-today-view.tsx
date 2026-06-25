"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  Percent,
  Radio,
  Route,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  DataTable,
  Table,
  TableHead,
  Th,
  TBody,
  Tr,
  Td,
} from "@/src/components/ui/data-table";
import type { ChipTone } from "@/src/components/design-system/types";
import {
  EmptyState,
  HeroPanel,
  KpiCard,
  PageLayout,
  PageSection,
  Panel,
  SectionHeader,
  StatusChip,
} from "@/src/components/design-system";
import { fleetLegacySeverityToTone } from "@/src/components/design-system/chip-maps";
import type {
  FleetMetricDelta,
  FleetOperationalException,
  FleetRecommendationHistoryEntry,
  FleetRecommendationInstance,
  FleetTodayViewData,
} from "@/src/types/fleet";
import { formatFleetCurrency, formatDataFreshness } from "@/src/lib/fleet/ui/format";
import { severityToFleetSeverity } from "@/src/lib/fleet/ui/severity";
import {
  confidenceLabel,
  formatRecommendationType,
  recommendationConfidence,
  type RecommendationConfidence,
} from "./fleet-recommendation-utils";

type FleetTodayViewProps = {
  initialData: FleetTodayViewData;
  canManageFleet: boolean;
};

function shiftGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function confidenceTone(confidence: RecommendationConfidence): ChipTone {
  switch (confidence) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    default:
      return "neutral";
  }
}

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

export function FleetTodayView({ initialData, canManageFleet }: FleetTodayViewProps) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/fleet/today-view", { cache: "no-store" });
    if (!res.ok) {
      setError("Unable to refresh command center data.");
      return;
    }
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
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          setError(
            payload.error ??
              (action === "accept"
                ? "Unable to accept recommendation."
                : "Unable to dismiss recommendation.")
          );
          return;
        }
        await refresh();
      });
    },
    [refresh]
  );

  const cc = data.commandCenter;
  const insights = data.executiveInsights;
  const criticalCount = data.exceptions.filter((e) => e.severity === "critical").length;
  const primaryRec = data.recommendations.pending[0];
  const secondaryRecs = data.recommendations.pending.slice(1);
  const recentHistory = data.recommendations.history.slice(0, 6);

  const contributionProtected = useMemo(() => {
    if (primaryRec?.rationale.candidate_snapshots?.[0]?.estimated_contribution != null) {
      return primaryRec.rationale.candidate_snapshots[0].estimated_contribution;
    }
    return insights?.contributionAtRisk ?? cc.contributionAtRisk ?? data.revenueAtRisk;
  }, [primaryRec, insights, cc.contributionAtRisk, data.revenueAtRisk]);

  const jobsAtRisk = cc.unassignedJobs;
  const acceptanceRate =
    data.recommendationRoi?.acceptanceRate ?? data.recommendations.summary.acceptanceRate;

  const hero = (
    <HeroPanel id="fleet-command-hero" className="space-y-6">
      {/* Briefing header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="cs-text-eyebrow">Operational briefing</p>
          <h1 className="cs-text-display">{shiftGreeting()}</h1>
          <p className="cs-text-body cs-text-muted max-w-3xl">{data.executiveSummary}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="cs-text-caption cs-text-muted">{data.date}</span>
          <span className="inline-flex items-center gap-1.5 cs-text-caption cs-text-muted">
            <Radio className="size-3.5 text-[var(--brand-operational)]" strokeWidth={2} aria-hidden />
            Data {formatDataFreshness(data.recommendations.generatedAt)}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()} disabled={pending}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Operational health */}
      <div className="flex flex-wrap gap-2">
        <StatusChip
          label={data.pendingActionCount > 0 ? `${data.pendingActionCount} need attention` : "Operations nominal"}
          tone={data.pendingActionCount > 0 ? "warning" : "success"}
        />
        {criticalCount > 0 ? (
          <StatusChip label={`${criticalCount} critical`} tone="danger" />
        ) : null}
        <StatusChip
          label={`${cc.activeTrucks} trucks live`}
          tone="operational"
        />
        <StatusChip
          label={jobsAtRisk > 0 ? `${jobsAtRisk} jobs at risk` : "No jobs at risk"}
          tone={jobsAtRisk > 0 ? "danger" : "success"}
        />
        {data.integrationHealth.map((conn) => (
          <StatusChip
            key={conn.id}
            label={conn.displayName}
            tone={
              conn.status === "healthy"
                ? "success"
                : conn.status === "error"
                  ? "danger"
                  : "warning"
            }
          />
        ))}
      </div>

      {/* Hero metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="cs-text-micro cs-text-muted">Contribution protected today</p>
          <p className="cs-text-kpi mt-1 text-[var(--status-success)]">
            {formatFleetCurrency(contributionProtected ?? 0)}
          </p>
        </div>
        <div>
          <p className="cs-text-micro cs-text-muted">Today&apos;s contribution</p>
          <p className="cs-text-kpi mt-1">
            {cc.estimatedContributionToday != null
              ? formatFleetCurrency(cc.estimatedContributionToday)
              : "—"}
          </p>
        </div>
        <div>
          <p className="cs-text-micro cs-text-muted">Fleet utilization</p>
          <p className="cs-text-kpi mt-1">
            {cc.utilizationPercent != null ? `${cc.utilizationPercent.toFixed(1)}%` : "—"}
          </p>
        </div>
        <div>
          <p className="cs-text-micro cs-text-muted">Revenue at risk</p>
          <p className="cs-text-kpi mt-1">
            {data.revenueAtRisk > 0 ? formatFleetCurrency(data.revenueAtRisk) : "—"}
          </p>
        </div>
      </div>

      {/* Top recommendation — focal action inside hero */}
      <div id="fleet-recommendations" className="scroll-mt-6 space-y-4 border-t border-[var(--surface-border-subtle)] pt-6">
        <SectionHeader
          eyebrow="Highest-value decision"
          title={primaryRec ? primaryRec.rationale.title : "No pending recommendations"}
          description={
            primaryRec
              ? formatRecommendationType(primaryRec.recommendation_type)
              : "Fleet is operating within normal parameters. Monitor exceptions below or open dispatch."
          }
          action={
            primaryRec ? (
              <div className="flex flex-wrap gap-2">
                <StatusChip label={`Score ${primaryRec.score.toFixed(0)}`} tone="info" showDot={false} />
                <StatusChip
                  label={confidenceLabel(recommendationConfidence(primaryRec))}
                  tone={confidenceTone(recommendationConfidence(primaryRec))}
                />
              <StatusChip label={`Status ${primaryRec.status}`} tone="info" showDot={false} />
              {!canManageFleet ? (
                <StatusChip label="Viewer mode" tone="neutral" showDot={false} />
              ) : null}
              </div>
            ) : null
          }
        />

        {primaryRec ? (
          <HeroRecommendationBody
            recommendation={primaryRec}
            pending={pending}
            canManageFleet={canManageFleet}
            onAction={onRecommendationAction}
          />
        ) : (
          <EmptyState
            icon={<CheckCircle2 className="size-8 text-[var(--status-success)]" />}
            title="All recommendations addressed"
            description="Check back after dispatch changes or when new jobs are ingested."
            action={
              <Button type="button" variant="secondary" size="sm" asChild>
                <Link href="/dispatch">View Dispatch</Link>
              </Button>
            }
          />
        )}
      </div>
    </HeroPanel>
  );

  return (
    <div data-testid="fleet-today-view">
      <PageLayout hero={hero}>
      {error ? (
        <Panel level="default" padding="sm" className="border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)] bg-[var(--status-danger-subtle)]">
          <p className="cs-text-body text-[var(--status-danger)]">{error}</p>
        </Panel>
      ) : null}

      {/* Supporting KPI strip */}
      <PageSection>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <KpiCard label="Active trucks" value={cc.activeTrucks} hint="Live on GPS" icon={Truck} emphasis="operational" />
          <KpiCard
            label="Idle / offline"
            value={cc.idleTrucks}
            hint="Needs attention"
            icon={Clock}
            emphasis={cc.idleTrucks > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Jobs today"
            value={cc.jobsToday}
            hint={`${cc.unassignedJobs} unassigned`}
            icon={ClipboardList}
            emphasis={cc.unassignedJobs > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Utilization"
            value={cc.utilizationPercent != null ? `${cc.utilizationPercent.toFixed(1)}%` : "—"}
            hint="Billable today"
            icon={Percent}
          />
          <KpiCard
            label="Est. contribution"
            value={
              cc.estimatedContributionToday != null
                ? formatFleetCurrency(cc.estimatedContributionToday)
                : "—"
            }
            hint="Operational margin"
            icon={DollarSign}
            emphasis="success"
          />
          <KpiCard
            label="Deadhead cost"
            value={
              cc.deadheadCostToday != null ? formatFleetCurrency(cc.deadheadCostToday) : "—"
            }
            hint="Today"
            icon={Route}
            emphasis={
              cc.deadheadCostToday != null && cc.deadheadCostToday > 0 ? "warning" : "default"
            }
          />
          <KpiCard
            label="Overtime risk"
            value={
              cc.overtimeCostToday != null ? formatFleetCurrency(cc.overtimeCostToday) : "—"
            }
            hint="Estimated today"
            icon={Users}
            emphasis={
              cc.overtimeCostToday != null && cc.overtimeCostToday > 0 ? "warning" : "default"
            }
          />
          <KpiCard
            label="Acceptance rate"
            value={acceptanceRate != null ? `${acceptanceRate.toFixed(0)}%` : "—"}
            hint={`${data.recommendations.pending.length} pending`}
            icon={Sparkles}
            emphasis={data.recommendations.pending.length > 0 ? "info" : "default"}
          />
        </div>
      </PageSection>

      {/* Recent operational activity */}
      <PageSection>
        <div className="grid gap-6 xl:grid-cols-12">
          {/* More recommendations */}
          {secondaryRecs.length > 0 ? (
            <div className="space-y-4 xl:col-span-5">
              <SectionHeader
                title="More recommendations"
                description={`${secondaryRecs.length} additional decision${secondaryRecs.length === 1 ? "" : "s"} ready`}
              />
              <ul className="space-y-3">
                {secondaryRecs.map((rec) => (
                  <li key={rec.id}>
                    <CompactRecommendationRow
                      recommendation={rec}
                      pending={pending}
                      canManageFleet={canManageFleet}
                      onAction={onRecommendationAction}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Exception queue */}
          <div
            id="fleet-exceptions"
            className={`scroll-mt-6 space-y-4 ${secondaryRecs.length > 0 ? "xl:col-span-7" : "xl:col-span-12"}`}
          >
            <SectionHeader
              title="Exception queue"
              description="Issues that need attention before they become costly."
              action={
                criticalCount > 0 ? (
                  <StatusChip label={`${criticalCount} critical`} tone="danger" />
                ) : null
              }
            />
            {data.exceptions.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="size-7 text-[var(--status-success)]" />}
                title="No exceptions"
                description="No operational exceptions detected for today."
              />
            ) : (
              <DataTable>
                <Table className="min-w-[520px]">
                  <TableHead>
                    <Th>Severity</Th>
                    <Th>Issue</Th>
                    <Th>Recommended action</Th>
                    <Th className="w-24">Action</Th>
                  </TableHead>
                  <TBody>
                    {data.exceptions.map((ex) => (
                      <ExceptionTableRow key={ex.id} exception={ex} />
                    ))}
                  </TBody>
                </Table>
              </DataTable>
            )}
          </div>
        </div>
      </PageSection>

      {/* Recent dispatch decisions */}
      {recentHistory.length > 0 ? (
        <PageSection>
          <SectionHeader
            title="Recent dispatch decisions"
            description="Recommendation outcomes from the last few actions."
          />
          <DataTable>
            <Table className="min-w-[600px]">
              <TableHead>
                <Th>Decision</Th>
                <Th>Type</Th>
                <Th>Outcome</Th>
                <Th>When</Th>
              </TableHead>
              <TBody>
                {recentHistory.map((entry) => (
                  <HistoryTableRow key={entry.id} entry={entry} />
                ))}
              </TBody>
            </Table>
          </DataTable>
        </PageSection>
      ) : null}

      {/* Supporting detail */}
      <PageSection>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <SectionHeader title="Changes since yesterday" />
            <DataTable>
              <Table>
                <TableHead>
                  <Th>Metric</Th>
                  <Th>Today</Th>
                  <Th>Trend</Th>
                </TableHead>
                <TBody>
                  {data.changesSinceYesterday.map((delta) => (
                    <Tr key={delta.key}>
                      <Td className="cs-text-muted">{delta.label}</Td>
                      <Td className="font-medium">{formatDeltaValue(delta)}</Td>
                      <Td>
                        <StatusChip
                          label={
                            delta.direction === "improved"
                              ? "Improved"
                              : delta.direction === "declined"
                                ? "Declined"
                                : delta.direction === "unchanged"
                                  ? "Unchanged"
                                  : "—"
                          }
                          tone={
                            delta.direction === "improved"
                              ? "success"
                              : delta.direction === "declined"
                                ? "danger"
                                : "neutral"
                          }
                          showDot={false}
                        />
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </DataTable>
          </div>

          <div className="space-y-4" data-testid="fleet-recommendation-roi">
            <SectionHeader
              title="Recommendation ROI"
              description="This week · impact from accepted recommendations"
              action={
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href="/reports/operations">
                    Fleet Performance <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              }
            />
            {data.recommendationRoi ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <KpiCard
                  label="Accepted"
                  value={data.recommendationRoi.accepted}
                  hint={`${data.recommendationRoi.acceptanceRate?.toFixed(0) ?? "—"}% rate`}
                />
                <KpiCard
                  label="Contribution protected"
                  value={formatFleetCurrency(data.recommendationRoi.contributionImprovement)}
                  emphasis="success"
                />
                <KpiCard
                  label="Revenue protected"
                  value={formatFleetCurrency(data.recommendationRoi.revenueProtected)}
                />
                <KpiCard
                  label="Applied / failed"
                  value={`${data.recommendationRoi.applied} / ${data.recommendationRoi.failed}`}
                  emphasis={data.recommendationRoi.failed > 0 ? "warning" : "default"}
                />
              </div>
            ) : (
              <EmptyState
                title="No outcomes yet"
                description="Accept recommendations to start measuring ROI this week."
              />
            )}
          </div>
        </div>
      </PageSection>

      {/* Branch capacity */}
      {(data.upcomingCapacityIssues.length > 0 || data.unusedCapacityBranches.length > 0) && (
        <PageSection>
          <SectionHeader
            title="Branch capacity"
            description="Where the fleet can absorb work — or is overcommitted."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            {data.upcomingCapacityIssues.length > 0 ? (
              <Panel level="default" padding="none">
                <div className="border-b border-[var(--surface-border-subtle)] px-5 py-3">
                  <p className="cs-text-section-title">Approaching limits</p>
                </div>
                <DataTable>
                  <Table>
                    <TableHead>
                      <Th>Branch</Th>
                      <Th>Utilization</Th>
                    </TableHead>
                    <TBody>
                      {data.upcomingCapacityIssues.slice(0, 5).map((b) => (
                        <Tr key={b.branch_id} clickable>
                          <Td>
                            <Link href={b.href} className="hover:underline">
                              {b.branch_name}
                            </Link>
                          </Td>
                          <Td>
                            <StatusChip
                              label={`${Math.round(b.utilization * 100)}%`}
                              tone="warning"
                              showDot={false}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </DataTable>
              </Panel>
            ) : null}
            {data.unusedCapacityBranches.length > 0 ? (
              <Panel level="default" padding="none">
                <div className="border-b border-[var(--surface-border-subtle)] px-5 py-3">
                  <p className="cs-text-section-title">Available capacity</p>
                </div>
                <DataTable>
                  <Table>
                    <TableHead>
                      <Th>Branch</Th>
                      <Th>Available</Th>
                    </TableHead>
                    <TBody>
                      {data.unusedCapacityBranches.slice(0, 5).map((b) => (
                        <Tr key={b.branch_id} clickable>
                          <Td>
                            <Link href={b.href} className="hover:underline">
                              {b.branch_name}
                            </Link>
                          </Td>
                          <Td>
                            <StatusChip
                              label={`${Math.round((1 - b.utilization) * 100)}%`}
                              tone="success"
                              showDot={false}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </DataTable>
              </Panel>
            ) : null}
          </div>
        </PageSection>
      )}

      {/* Demoted executive detail */}
      {insights ? (
        <PageSection>
          <div data-testid="fleet-executive-insights" className="space-y-4">
          <SectionHeader
            title="Profit signals"
            description="Supporting context — full analysis in Fleet Performance."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Contribution at risk"
              value={formatFleetCurrency(insights.contributionAtRisk)}
              hint="Unassigned jobs"
              emphasis={insights.contributionAtRisk > 0 ? "danger" : "default"}
            />
            <KpiCard
              label="Best branch"
              value={insights.highestPerformingBranch?.branch_name ?? "—"}
              hint={
                insights.highestPerformingBranch
                  ? formatFleetCurrency(insights.highestPerformingBranch.contribution)
                  : undefined
              }
            />
            <KpiCard
              label="Largest cost leak"
              value={formatFleetCurrency(insights.largestCostLeak.amount)}
              hint={insights.largestCostLeak.label}
              emphasis={insights.largestCostLeak.amount > 0 ? "warning" : "default"}
            />
            <KpiCard
              label="Rec. value this week"
              value={formatFleetCurrency(insights.recommendationValueThisWeek)}
              hint={`${insights.largestRecommendationOpportunity} opportunities`}
            />
          </div>
          </div>
        </PageSection>
      ) : null}
      </PageLayout>
    </div>
  );
}

function HeroRecommendationBody({
  recommendation,
  pending,
  canManageFleet,
  onAction,
}: {
  recommendation: FleetRecommendationInstance;
  pending: boolean;
  canManageFleet: boolean;
  onAction: (id: string, action: "accept" | "dismiss") => void;
}) {
  const candidates = recommendation.rationale.candidates ?? [];
  const topCandidate = candidates[0];
  const topSnapshot = recommendation.rationale.candidate_snapshots?.[0];
  const isCapacityOnly = recommendation.recommendation_type === "capacity_overload";

  return (
    <div className="space-y-5">
      {topCandidate ? (
        <p className="cs-text-body">
          <span className="cs-text-muted">Assign </span>
          <span className="font-semibold">Truck {topCandidate.unit_number}</span>
          {recommendation.rationale.entities.job_id ? (
            <>
              <span className="cs-text-muted"> to job </span>
              <span className="font-medium">{recommendation.rationale.entities.job_id.slice(0, 8)}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {topSnapshot ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="cs-text-micro cs-text-muted">Financial impact</p>
            <p className="cs-text-kpi mt-1 text-[var(--status-success)]">
              {formatFleetCurrency(topSnapshot.estimated_contribution)}
            </p>
          </div>
          {topSnapshot.deadhead_miles != null ? (
            <div>
              <p className="cs-text-micro cs-text-muted">Est. deadhead</p>
              <p className="cs-text-kpi mt-1">{topSnapshot.deadhead_miles.toFixed(1)} mi</p>
            </div>
          ) : null}
          {topSnapshot.travel_minutes != null ? (
            <div>
              <p className="cs-text-micro cs-text-muted">Travel savings</p>
              <p className="cs-text-kpi mt-1">{Math.round(topSnapshot.travel_minutes)} min</p>
            </div>
          ) : null}
          <div>
            <p className="cs-text-micro cs-text-muted">Data freshness</p>
            <p className="cs-text-kpi mt-1">{topSnapshot.gps_label}</p>
          </div>
        </div>
      ) : null}

      <p className="cs-text-caption cs-text-muted">
        Confidence and impact are operational estimates based on current telemetry and scheduling data.
      </p>

      <div>
        <p className="cs-text-micro cs-text-muted">Why this truck</p>
        <ul className="mt-2 space-y-1.5">
          {recommendation.rationale.reasons.map((reason) => (
            <li key={reason} className="cs-text-body cs-text-muted flex gap-2">
              <span className="text-[var(--brand-operational)]">·</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {candidates.length > 1 ? (
        <div>
          <p className="cs-text-micro cs-text-muted">Alternatives considered</p>
          <ul className="mt-2 space-y-1">
            {candidates.slice(1, 3).map((c) => (
              <li key={c.truck_id} className="cs-text-caption cs-text-muted">
                Truck {c.unit_number} — score {c.score.toFixed(0)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="button"
          size="md"
          onClick={() => onAction(recommendation.id, "accept")}
          disabled={pending || !canManageFleet}
        >
          {isCapacityOnly ? "Acknowledge" : "Accept recommendation"}
        </Button>
        <Button type="button" size="md" variant="secondary" asChild>
          <Link href="/dispatch">View dispatch</Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onAction(recommendation.id, "dismiss")}
          disabled={pending || !canManageFleet}
        >
          Dismiss
        </Button>
      </div>
      {!canManageFleet ? (
        <p className="cs-text-caption cs-text-muted">
          You have view access. Ask a fleet manager to accept or dismiss recommendations.
        </p>
      ) : null}
    </div>
  );
}

function CompactRecommendationRow({
  recommendation,
  pending,
  canManageFleet,
  onAction,
}: {
  recommendation: FleetRecommendationInstance;
  pending: boolean;
  canManageFleet: boolean;
  onAction: (id: string, action: "accept" | "dismiss") => void;
}) {
  const confidence = recommendationConfidence(recommendation);
  const snapshot = recommendation.rationale.candidate_snapshots?.[0];
  const isCapacityOnly = recommendation.recommendation_type === "capacity_overload";

  return (
    <Panel level="default" padding="sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="cs-text-body font-medium">{recommendation.rationale.title}</p>
          <p className="cs-text-caption cs-text-muted mt-0.5">
            {formatRecommendationType(recommendation.recommendation_type)}
            {snapshot ? ` · ${formatFleetCurrency(snapshot.estimated_contribution)}` : ""}
          </p>
        </div>
        <StatusChip label={confidenceLabel(confidence)} tone={confidenceTone(confidence)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onAction(recommendation.id, "accept")}
          disabled={pending || !canManageFleet}
        >
          {isCapacityOnly ? "Acknowledge" : "Accept"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onAction(recommendation.id, "dismiss")}
          disabled={pending || !canManageFleet}
        >
          Dismiss
        </Button>
      </div>
    </Panel>
  );
}

function ExceptionTableRow({ exception: ex }: { exception: FleetOperationalException }) {
  const tone = fleetLegacySeverityToTone(severityToFleetSeverity(ex.severity));

  return (
    <Tr>
      <Td>
        <StatusChip label={ex.severity} tone={tone} />
      </Td>
      <Td>
        <p className="font-medium">{ex.title}</p>
        <p className="cs-text-caption cs-text-muted mt-0.5">{ex.whyItMatters}</p>
      </Td>
      <Td className="cs-text-caption cs-text-muted">{ex.recommendedAction}</Td>
      <Td>
        <Button type="button" size="sm" variant="secondary" asChild>
          <Link href={ex.href}>Act</Link>
        </Button>
      </Td>
    </Tr>
  );
}

function HistoryTableRow({ entry }: { entry: FleetRecommendationHistoryEntry }) {
  const outcome = entry.latest_outcome;
  const action = outcome?.action ?? "pending";
  const tone: ChipTone =
    action === "accepted" || action === "applied"
      ? "success"
      : action === "dismissed" || action === "expired"
        ? "neutral"
        : action === "failed"
          ? "danger"
          : "info";

  return (
    <Tr>
      <Td className="max-w-[200px]">
        <p className="truncate font-medium">{entry.rationale.title}</p>
      </Td>
      <Td className="cs-text-caption cs-text-muted">
        {formatRecommendationType(entry.recommendation_type)}
      </Td>
      <Td>
        <StatusChip label={action.replace(/_/g, " ")} tone={tone} showDot={false} />
      </Td>
      <Td className="cs-text-caption cs-text-muted">
        {outcome?.acted_at ? formatDataFreshness(outcome.acted_at) : "—"}
      </Td>
    </Tr>
  );
}
