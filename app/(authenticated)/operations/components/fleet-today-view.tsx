"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Radio,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import type { ChipTone } from "@/src/components/design-system/types";
import {
  EmptyState,
  HeroPanel,
  IconChip,
  PageLayout,
  PageSection,
  Panel,
  SectionHeader,
  StatusChip,
  AppIcon,
} from "@/src/components/design-system";
import type {
  FleetMetricDelta,
  FleetRecommendationInstance,
  FleetTodayViewData,
} from "@/src/types/fleet";
import { formatFleetCurrency } from "@/src/lib/fleet/ui/format";
import { RelativeFreshness } from "@/src/components/fleet/ui/fleet-data-freshness";
import {
  confidenceLabel,
  formatRecommendationType,
  recommendationConfidence,
  type RecommendationConfidence,
} from "./fleet-recommendation-utils";
import { FleetCommandKpiWorkspace } from "./FleetCommandKpiWorkspace";
import { FleetOperationsMainBody } from "./FleetOperationsMainBody";
import { useOperationsProgressiveLoad } from "./useOperationsProgressiveLoad";
import { useOperationsSecondaryLoad } from "./useOperationsSecondaryLoad";

type FleetTodayViewProps = {
  initialData?: FleetTodayViewData;
  /** Client-first progressive loading — no server data required. */
  progressive?: boolean;
  enrichOnMount?: boolean;
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

export function FleetTodayView({ initialData, progressive = false, enrichOnMount = false }: FleetTodayViewProps) {
  const { data: progressiveData, loaded: progressiveLoaded, errors: progressiveErrors, refresh: refreshProgressive } =
    useOperationsProgressiveLoad();
  const [legacyData, setLegacyData] = useState(initialData ?? progressiveData);
  const [legacyEnrichmentDone, setLegacyEnrichmentDone] = useState(!enrichOnMount);
  const [error, setError] = useState<string | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const loaded = progressive
    ? progressiveLoaded
    : { summary: true, briefing: true, enrichment: legacyEnrichmentDone };
  const sectionErrors = progressive ? progressiveErrors : { summary: null, briefing: null, enrichment: null };

  const data = progressive ? progressiveData : legacyData;

  useOperationsSecondaryLoad(
    Boolean(enrichOnMount && !progressive && initialData),
    data.date,
    (payload) => {
      setLegacyData(payload);
      setLegacyEnrichmentDone(true);
    }
  );

  const enriching =
    (progressive && !loaded.enrichment) ||
    (!progressive && enrichOnMount && !loaded.enrichment) ||
    Boolean(data.recommendations.refreshing);

  const refresh = useCallback(async () => {
    if (progressive) {
      await refreshProgressive();
      setListRefreshKey((k) => k + 1);
      setError(null);
      return;
    }
    const res = await fetch("/api/fleet/today-view", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as FleetTodayViewData;
    setLegacyData(payload);
    setListRefreshKey((k) => k + 1);
    setError(null);
  }, [progressive, refreshProgressive]);

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
        setListRefreshKey((k) => k + 1);
      });
    },
    [refresh]
  );

  const cc = data.commandCenter;
  const insights = data.executiveInsights;
  const criticalCount =
    data.exceptionCounts?.critical ??
    data.exceptions.filter((e) => e.severity === "critical").length;
  const exceptionTotalCount = data.exceptionCounts?.total ?? 0;
  const pendingRecommendationCount =
    data.pendingRecommendationCount ?? data.recommendations.summary.volume ?? data.recommendations.pending.length;
  const secondaryRecommendationCount = Math.max(0, pendingRecommendationCount - (data.recommendations.pending[0] ? 1 : 0));
  const primaryRec = data.recommendations.pending[0];
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
          <div className="flex items-center gap-3">
            <IconChip icon={ClipboardList} variant="fleet" size="md" glow label="Operational briefing" />
            <p className="cs-text-eyebrow">Operational briefing</p>
          </div>
          <h1 className="cs-text-display">{shiftGreeting()}</h1>
          {loaded.briefing ? (
            <p className="cs-text-body cs-text-muted max-w-3xl">{data.executiveSummary}</p>
          ) : (
            <div className="space-y-2 max-w-3xl" aria-hidden>
              <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-border-subtle)]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--surface-border-subtle)]" />
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="cs-text-caption cs-text-muted">{data.date}</span>
          <span className="inline-flex items-center gap-1.5 cs-text-caption cs-text-muted">
            <AppIcon icon={Radio} size="sm" intent="operational" />
            <RelativeFreshness iso={data.recommendations.generatedAt} prefix="Data " />
          </span>
          {enriching || data.recommendations.refreshing ? (
            <StatusChip label="Syncing recommendations…" tone="operational" showDot={false} />
          ) : null}
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
        {loaded.summary ? (
          <>
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
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--surface-border-subtle)]" aria-hidden />
          ))
        )}
      </div>

      {/* Top recommendation — focal action inside hero */}
      <div id="fleet-recommendations" className="scroll-mt-6 space-y-4 border-t border-[var(--surface-border-subtle)] pt-6">
        {!loaded.briefing ? (
          <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading recommendations">
            <div className="h-5 w-48 rounded bg-[var(--surface-border-subtle)]" />
            <div className="h-8 w-3/4 rounded bg-[var(--surface-border-subtle)]" />
            <div className="h-24 rounded-xl bg-[var(--surface-border-subtle)]" />
          </div>
        ) : (
          <>
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
              </div>
            ) : null
          }
        />

        {primaryRec ? (
          <HeroRecommendationBody
            recommendation={primaryRec}
            pending={pending}
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
          </>
        )}
      </div>
    </HeroPanel>
  );

  return (
    <div data-testid="fleet-today-view">
      <PageLayout hero={hero}>
      {error || sectionErrors.summary || sectionErrors.briefing ? (
        <Panel level="default" padding="sm" className="border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)] bg-[var(--status-danger-subtle)]">
          <p className="cs-text-body text-[var(--status-danger)]">
            {error ?? sectionErrors.briefing ?? sectionErrors.summary}
          </p>
        </Panel>
      ) : null}

      <PageSection>
        <FleetCommandKpiWorkspace
          date={data.date}
          commandCenter={cc}
          acceptanceRate={acceptanceRate}
          pendingRecommendations={pendingRecommendationCount}
          kpiReady={loaded.summary}
        >
          <FleetOperationsMainBody
            data={data}
            listsEnabled={loaded.summary}
            secondaryRecommendationCount={secondaryRecommendationCount}
            criticalCount={criticalCount}
            exceptionTotalCount={exceptionTotalCount}
            pending={pending}
            listRefreshKey={listRefreshKey}
            onRecommendationAction={onRecommendationAction}
            recentHistory={recentHistory}
            insights={insights}
            formatDeltaValue={formatDeltaValue}
          />
        </FleetCommandKpiWorkspace>
      </PageSection>
      </PageLayout>
    </div>
  );
}

function HeroRecommendationBody({
  recommendation,
  pending,
  onAction,
}: {
  recommendation: FleetRecommendationInstance;
  pending: boolean;
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
          disabled={pending}
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
          disabled={pending}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
