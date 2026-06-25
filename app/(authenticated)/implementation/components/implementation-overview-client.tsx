"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Sparkles } from "lucide-react";
import {
  EmptyState,
  HeroPanel,
  KpiCard,
  PageLayout,
  PageSection,
  Panel,
  SectionHeader,
  SkeletonKpiGrid,
  SkeletonText,
  StatusChip,
} from "@/src/components/design-system";
import { Button } from "@/src/components/ui/button";
import type { ConnectorSummary } from "@/src/lib/integrations/connector-service";

type ReadinessSnapshot = {
  implementationProgressPct: number;
  readinessScorePct: number;
  checks: Array<{
    code: string;
    label: string;
    status: "ready" | "warning" | "blocked";
    detail: string;
    estimated: boolean;
  }>;
  counts: {
    connectorsActive: number;
    importsCompleted: number;
    jobs: number;
    trucksWithTelematics: number;
    recommendationsPending: number;
  };
};

type BaselineSnapshot = {
  metrics: Array<{ key: string; value: number; estimated: boolean }>;
};

type ImportBatch = {
  object_type: string;
  status: string;
  imported_rows: number;
  error_rows: number;
  duplicate_rows: number;
};

type ChecklistItem = {
  label: string;
  status: "complete" | "incomplete" | "needs_attention";
  recommendedAction: string;
  href: string;
  percentComplete: number;
};

type FocusCard = {
  label: string;
  value: string;
  hint: string;
  href: string;
  emphasis: "default" | "success" | "warning" | "danger" | "info" | "operational";
};

export function ImplementationOverviewClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessSnapshot | null>(null);
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [importHistory, setImportHistory] = useState<ImportBatch[]>([]);
  const [baseline, setBaseline] = useState<BaselineSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [readinessRes, connectorsRes, importsRes, baselineRes] = await Promise.all([
          fetch("/api/integrations/readiness", { cache: "no-store" }),
          fetch("/api/integrations/connectors", { cache: "no-store" }),
          fetch("/api/integrations/import/history?limit=200", { cache: "no-store" }),
          fetch("/api/integrations/baseline?window_days=90", { cache: "no-store" }),
        ]);

        if (!readinessRes.ok) throw new Error("Failed to load readiness snapshot.");
        if (!connectorsRes.ok) throw new Error("Failed to load connectors.");
        if (!importsRes.ok) throw new Error("Failed to load import history.");
        if (!baselineRes.ok) throw new Error("Failed to load baseline metrics.");

        const readinessData = (await readinessRes.json()) as ReadinessSnapshot;
        const connectorsData = (await connectorsRes.json()) as { connectors: ConnectorSummary[] };
        const importsData = (await importsRes.json()) as { batches: ImportBatch[] };
        const baselineData = (await baselineRes.json()) as BaselineSnapshot;

        if (!active) return;
        setReadiness(readinessData);
        setConnectors(connectorsData.connectors ?? []);
        setImportHistory(importsData.batches ?? []);
        setBaseline(baselineData);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load implementation data.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const checklist = useMemo<ChecklistItem[]>(() => {
    const completedObjects = new Set(
      importHistory
        .filter((batch) => batch.status === "completed" || batch.status === "partial")
        .map((batch) => batch.object_type)
    );
    const hasImportErrors = importHistory.some((batch) => batch.error_rows > 0 || batch.status === "failed");
    const revenuePerTruck = baseline?.metrics.find((metric) => metric.key === "revenue_per_truck")?.value ?? 0;
    const historicalReady = readiness?.checks.find((check) => check.code === "historical_data_readiness");
    const anyHealthyConnector = connectors.some((connector) => connector.health.status === "healthy");

    const itemStatus = (completed: boolean, warning?: boolean): ChecklistItem["status"] =>
      completed ? "complete" : warning ? "needs_attention" : "incomplete";

    return [
      {
        label: "Company",
        status: itemStatus(completedObjects.has("branches")),
        recommendedAction: "Confirm business profile, timezone, and operating defaults.",
        href: "/implementation/settings",
        percentComplete: completedObjects.has("branches") ? 100 : 40,
      },
      {
        label: "Branches",
        status: itemStatus(completedObjects.has("branches")),
        recommendedAction: "Import branch master data.",
        href: "/implementation/imports",
        percentComplete: completedObjects.has("branches") ? 100 : 0,
      },
      {
        label: "Trucks",
        status: itemStatus(completedObjects.has("trucks"), hasImportErrors),
        recommendedAction: "Import truck registry and telematics identifiers.",
        href: "/implementation/imports",
        percentComplete: completedObjects.has("trucks") ? 100 : 0,
      },
      {
        label: "Operators",
        status: itemStatus(completedObjects.has("operators"), hasImportErrors),
        recommendedAction: "Import operators and branch assignments.",
        href: "/implementation/imports",
        percentComplete: completedObjects.has("operators") ? 100 : 0,
      },
      {
        label: "Customers",
        status: itemStatus(completedObjects.has("customers")),
        recommendedAction: "Import customer records for job attribution.",
        href: "/implementation/imports",
        percentComplete: completedObjects.has("customers") ? 100 : 0,
      },
      {
        label: "Jobs",
        status: itemStatus(completedObjects.has("jobs"), hasImportErrors),
        recommendedAction: "Import or sync jobs from external systems.",
        href: "/implementation/imports",
        percentComplete: completedObjects.has("jobs") ? 100 : 0,
      },
      {
        label: "Sites",
        status: itemStatus(completedObjects.has("sites"), hasImportErrors),
        recommendedAction: "Import customer sites with geolocation.",
        href: "/implementation/imports",
        percentComplete: completedObjects.has("sites") ? 100 : 0,
      },
      {
        label: "GPS Connected",
        status: itemStatus((readiness?.counts.trucksWithTelematics ?? 0) > 0, !anyHealthyConnector),
        recommendedAction: "Connect telematics source and verify recent sync.",
        href: "/implementation/connections",
        percentComplete: (readiness?.counts.trucksWithTelematics ?? 0) > 0 ? 100 : 25,
      },
      {
        label: "Revenue Source",
        status: itemStatus(revenuePerTruck > 0, revenuePerTruck === 0 && completedObjects.has("jobs")),
        recommendedAction: "Map revenue fields during import validation.",
        href: "/implementation/imports",
        percentComplete: revenuePerTruck > 0 ? 100 : completedObjects.has("jobs") ? 60 : 0,
      },
      {
        label: "Historical Data",
        status: itemStatus(historicalReady?.status === "ready", historicalReady?.status === "warning"),
        recommendedAction: "Run baseline lookback and address mart freshness issues.",
        href: "/implementation/baseline",
        percentComplete: historicalReady?.status === "ready" ? 100 : historicalReady?.status === "warning" ? 60 : 0,
      },
    ];
  }, [baseline, connectors, importHistory, readiness]);

  const focusCards = useMemo<FocusCard[]>(() => {
    const revenuePerTruck = baseline?.metrics.find((metric) => metric.key === "revenue_per_truck")?.value ?? 0;
    const historicalReady = readiness?.checks.find((check) => check.code === "historical_data_readiness");
    const healthyConnectors = connectors.filter((connector) => connector.health.status === "healthy").length;
    const warningConnectors = connectors.filter((connector) => connector.health.status === "warning").length;

    return [
      {
        label: "Connections",
        value: `${readiness?.counts.connectorsActive ?? 0}`,
        hint:
          warningConnectors > 0
            ? `${warningConnectors} connector(s) need attention`
            : `${healthyConnectors} healthy connector(s)`,
        href: "/implementation/connections",
        emphasis: warningConnectors > 0 ? "warning" : "success",
      },
      {
        label: "Imports",
        value: `${readiness?.counts.importsCompleted ?? 0}`,
        hint: "Completed import batches",
        href: "/implementation/imports",
        emphasis: readiness?.counts.importsCompleted ? "operational" : "default",
      },
      {
        label: "Historical Data",
        value: historicalReady?.status === "ready" ? "Ready" : historicalReady?.status === "warning" ? "Stale" : "Missing",
        hint: historicalReady?.detail ?? "Historical readiness unknown",
        href: "/implementation/baseline",
        emphasis:
          historicalReady?.status === "ready"
            ? "success"
            : historicalReady?.status === "warning"
              ? "warning"
              : "danger",
      },
      {
        label: "Baseline",
        value: revenuePerTruck > 0 ? `$${Math.round(revenuePerTruck).toLocaleString()}` : "Not ready",
        hint: "Revenue per truck (90-day baseline)",
        href: "/implementation/baseline",
        emphasis: revenuePerTruck > 0 ? "success" : "default",
      },
      {
        label: "Fleet Health",
        value: `${connectors.filter((connector) => connector.health.status === "healthy").length}/${Math.max(
          connectors.length,
          1
        )}`,
        hint: "Healthy connectors / configured connectors",
        href: "/implementation/connections",
        emphasis: connectors.some((connector) => connector.health.status === "error") ? "danger" : "operational",
      },
      {
        label: "Recommendations Ready",
        value: `${readiness?.counts.recommendationsPending ?? 0}`,
        hint: "Pending recommendation opportunities",
        href: "/implementation/readiness",
        emphasis: (readiness?.counts.recommendationsPending ?? 0) > 0 ? "success" : "default",
      },
    ];
  }, [baseline, connectors, readiness]);

  if (loading) {
    return (
      <PageLayout
        hero={
          <HeroPanel>
            <SkeletonText lines={3} />
          </HeroPanel>
        }
      >
        <PageSection>
          <SkeletonKpiGrid count={6} />
        </PageSection>
        <PageSection>
          <Panel padding="md">
            <SkeletonText lines={8} />
          </Panel>
        </PageSection>
      </PageLayout>
    );
  }

  if (error || !readiness) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-5" />}
        title="Implementation overview unavailable"
        description={error ?? "Unable to load implementation data."}
        action={
          <Button type="button" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <PageLayout
      hero={
        <HeroPanel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="cs-text-eyebrow">Enterprise onboarding progress</p>
              <h2 className="cs-text-display">
                Implementation Progress {readiness.implementationProgressPct}%
              </h2>
              <p className="cs-text-body cs-text-muted">
                Readiness Score {readiness.readinessScorePct}% — complete the checklist to begin using
                Cornerstone recommendations confidently.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip
                label={readiness.readinessScorePct >= 85 ? "Pilot ready" : "In progress"}
                tone={readiness.readinessScorePct >= 85 ? "success" : "warning"}
              />
            </div>
          </div>
        </HeroPanel>
      }
    >
      <PageSection>
        <SectionHeader
          title="Implementation dashboard"
          description="Track progress across connections, imports, baseline, and readiness."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {focusCards.map((card) => (
            <Link key={card.label} href={card.href} className="block">
              <KpiCard
                label={card.label}
                value={card.value}
                hint={card.hint}
                emphasis={card.emphasis}
                className="cursor-pointer"
              />
            </Link>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <SectionHeader
          title="Implementation checklist"
          description="Every section includes completion status, recommended next action, and progress."
        />
        <Panel padding="none">
          <div className="divide-y divide-[var(--surface-border-subtle)]">
            {checklist.map((item) => (
              <div
                key={item.label}
                className="grid gap-3 px-4 py-3 lg:grid-cols-[220px_140px_minmax(0,1fr)_130px_auto] lg:items-center"
              >
                <p className="cs-text-body font-medium">{item.label}</p>
                <StatusChip
                  label={
                    item.status === "complete"
                      ? "Complete"
                      : item.status === "needs_attention"
                        ? "Needs Attention"
                        : "Incomplete"
                  }
                  tone={
                    item.status === "complete"
                      ? "success"
                      : item.status === "needs_attention"
                        ? "warning"
                        : "neutral"
                  }
                />
                <p className="cs-text-caption cs-text-muted">{item.recommendedAction}</p>
                <div className="flex items-center gap-2">
                  {item.status === "complete" ? (
                    <CheckCircle2 className="size-4 text-[var(--status-success)]" aria-hidden />
                  ) : item.status === "needs_attention" ? (
                    <AlertTriangle className="size-4 text-[var(--status-warning)]" aria-hidden />
                  ) : (
                    <CircleDashed className="size-4 text-[var(--text-muted)]" aria-hidden />
                  )}
                  <span className="cs-text-caption">{item.percentComplete}%</span>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={item.href} className="inline-flex items-center gap-1">
                    Open <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      </PageSection>

      <PageSection>
        <Panel padding="md" className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--status-operational)]" />
            <p className="cs-text-body font-medium">Recommended next action</p>
          </div>
          <p className="cs-text-caption cs-text-muted">
            {readiness.readinessScorePct >= 85
              ? "Your implementation is ready for pilot activation. Review Sync History and begin operational recommendations."
              : "Complete blocked checklist items first, then validate imports and baseline before enabling recommendation workflows."}
          </p>
        </Panel>
      </PageSection>
    </PageLayout>
  );
}
