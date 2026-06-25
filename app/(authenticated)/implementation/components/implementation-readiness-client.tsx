"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import {
  EmptyState,
  HeroPanel,
  PageLayout,
  PageSection,
  Panel,
  SectionHeader,
  SkeletonText,
  StatusChip,
} from "@/src/components/design-system";
import { Button } from "@/src/components/ui/button";
import {
  DataTable,
  Table,
  TableEmptyState,
  TableHead,
  TBody,
  Td,
  Th,
  Tr,
} from "@/src/components/ui/data-table";

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

type ImportBatch = {
  object_type: string;
  status: string;
  duplicate_rows: number;
  error_rows: number;
};

type SyncRun = {
  status: string;
};

type BaselineSnapshot = {
  metrics: Array<{ key: string; value: number }>;
};

type ReadinessIssue = {
  key: string;
  severity: "critical" | "warning" | "info";
  title: string;
  why: string;
  recommendation: string;
  href: string;
  open: boolean;
};

export function ImplementationReadinessClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessSnapshot | null>(null);
  const [issuesData, setIssuesData] = useState<{
    imports: ImportBatch[];
    runs: SyncRun[];
    baseline: BaselineSnapshot | null;
  }>({ imports: [], runs: [], baseline: null });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [readinessRes, importsRes, runsRes, baselineRes] = await Promise.all([
          fetch("/api/integrations/readiness", { cache: "no-store" }),
          fetch("/api/integrations/import/history?limit=120", { cache: "no-store" }),
          fetch("/api/integrations/sync-history?limit=120", { cache: "no-store" }),
          fetch("/api/integrations/baseline?window_days=90", { cache: "no-store" }),
        ]);

        if (!readinessRes.ok) throw new Error("Failed to load readiness snapshot.");
        if (!importsRes.ok) throw new Error("Failed to load import history.");
        if (!runsRes.ok) throw new Error("Failed to load sync history.");
        if (!baselineRes.ok) throw new Error("Failed to load baseline snapshot.");

        const readinessData = (await readinessRes.json()) as ReadinessSnapshot;
        const importsData = (await importsRes.json()) as { batches: ImportBatch[] };
        const runsData = (await runsRes.json()) as { runs: SyncRun[] };
        const baselineData = (await baselineRes.json()) as BaselineSnapshot;

        if (!active) return;
        setReadiness(readinessData);
        setIssuesData({
          imports: importsData.batches ?? [],
          runs: runsData.runs ?? [],
          baseline: baselineData,
        });
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load readiness.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const checklist = useMemo(() => {
    return [
      "GPS",
      "Jobs",
      "Operators",
      "Revenue",
      "Historical Data",
      "Customers",
      "Branches",
      "Telemetry",
      "Dispatch Ready",
      "Recommendation Ready",
    ].map((label) => {
      const match = readiness?.checks.find((check) => check.label.toLowerCase().includes(label.toLowerCase()));
      if (!match) {
        return { label, status: "warning" as const, detail: "Awaiting additional signal." };
      }
      return { label, status: match.status, detail: match.detail };
    });
  }, [readiness]);

  const issues = useMemo<ReadinessIssue[]>(() => {
    const imports = issuesData.imports;
    const runs = issuesData.runs;
    const baseline = issuesData.baseline;

    const hasObject = (objectType: string) =>
      imports.some((batch) => batch.object_type === objectType && (batch.status === "completed" || batch.status === "partial"));
    const hasDupes = (objectType: string) =>
      imports.some((batch) => batch.object_type === objectType && batch.duplicate_rows > 0);
    const hasFailedSyncs = runs.some((run) => run.status === "failed");
    const hasIncompleteImports = imports.some((batch) => batch.status === "failed" || batch.error_rows > 0);
    const revenueMetric = baseline?.metrics.find((metric) => metric.key === "revenue_per_truck")?.value ?? 0;
    const historicalReady =
      readiness?.checks.find((check) => check.code === "historical_data_readiness")?.status === "ready";

    return [
      {
        key: "missing_trucks",
        severity: "critical",
        title: "Missing Trucks",
        why: "Dispatch readiness requires truck master and telematics identifiers.",
        recommendation: "Import truck records and map external IDs.",
        href: "/implementation/imports",
        open: !hasObject("trucks"),
      },
      {
        key: "missing_operators",
        severity: "warning",
        title: "Missing Operators",
        why: "Recommendation quality depends on operator availability and utilization.",
        recommendation: "Import operator roster and branch assignments.",
        href: "/implementation/imports",
        open: !hasObject("operators"),
      },
      {
        key: "missing_revenue",
        severity: "critical",
        title: "Missing Revenue",
        why: "Baseline and contribution KPIs need job revenue signals.",
        recommendation: "Map revenue fields in job imports.",
        href: "/implementation/imports",
        open: revenueMetric <= 0,
      },
      {
        key: "missing_gps",
        severity: "critical",
        title: "Missing GPS",
        why: "Route, deadhead, and utilization analytics need telematics events.",
        recommendation: "Connect telematics connector and run sync.",
        href: "/implementation/connections",
        open: (readiness?.counts.trucksWithTelematics ?? 0) === 0,
      },
      {
        key: "duplicate_trucks",
        severity: "warning",
        title: "Duplicate Trucks",
        why: "Duplicate truck rows degrade dispatch and utilization calculations.",
        recommendation: "Resolve duplicate unit numbers and external IDs.",
        href: "/implementation/imports",
        open: hasDupes("trucks"),
      },
      {
        key: "duplicate_operators",
        severity: "warning",
        title: "Duplicate Operators",
        why: "Duplicate operators fragment labor and utilization metrics.",
        recommendation: "Deduplicate operators and preserve canonical external IDs.",
        href: "/implementation/imports",
        open: hasDupes("operators"),
      },
      {
        key: "failed_syncs",
        severity: "critical",
        title: "Failed Syncs",
        why: "Integration failures block freshness of operational telemetry.",
        recommendation: "Review sync logs and retry failed runs.",
        href: "/implementation/sync-history",
        open: hasFailedSyncs,
      },
      {
        key: "incomplete_imports",
        severity: "warning",
        title: "Incomplete Imports",
        why: "Partial or failed imports leave onboarding entities incomplete.",
        recommendation: "Re-run failed import batches after fixing validation errors.",
        href: "/implementation/imports",
        open: hasIncompleteImports,
      },
      {
        key: "missing_historical_data",
        severity: "warning",
        title: "Missing Historical Data",
        why: "Baseline confidence improves with historical utilization coverage.",
        recommendation: "Import 90–365 day historical data and refresh baseline.",
        href: "/implementation/baseline",
        open: !historicalReady,
      },
    ];
  }, [issuesData, readiness]);

  const openIssues = issues.filter((issue) => issue.open);

  if (loading) {
    return (
      <PageLayout
        hero={
          <HeroPanel>
            <SkeletonText lines={4} />
          </HeroPanel>
        }
      >
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
        title="Readiness unavailable"
        description={error ?? "Unable to load readiness data."}
      />
    );
  }

  return (
    <PageLayout
      hero={
        <HeroPanel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="cs-text-eyebrow">Readiness dashboard</p>
              <h2 className="cs-text-display">Readiness Score {readiness.readinessScorePct}%</h2>
              <p className="cs-text-body cs-text-muted">
                Implementation progress {readiness.implementationProgressPct}% with {openIssues.length} actionable issue(s).
              </p>
            </div>
            <StatusChip
              label={readiness.readinessScorePct >= 90 ? "Recommendation Ready" : "Action Required"}
              tone={readiness.readinessScorePct >= 90 ? "success" : "warning"}
            />
          </div>
        </HeroPanel>
      }
    >
      <PageSection>
        <SectionHeader title="Readiness checklist" description="Operational checklist for pilot activation." />
        <Panel padding="none">
          <div className="divide-y divide-[var(--surface-border-subtle)]">
            {checklist.map((item) => (
              <div key={item.label} className="grid gap-2 px-4 py-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                <div className="flex items-center gap-2">
                  <p className="cs-text-body font-medium">{item.label}</p>
                  <StatusChip
                    label={item.status}
                    tone={
                      item.status === "ready"
                        ? "success"
                        : item.status === "warning"
                          ? "warning"
                          : "danger"
                    }
                    showDot={false}
                  />
                </div>
                <p className="cs-text-caption cs-text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </PageSection>

      <PageSection>
        <SectionHeader
          title="Actionable issues"
          description="Each issue includes severity, why it matters, recommendation, and navigation to fix."
        />
        <DataTable>
          <Table className="min-w-[980px]">
            <TableHead>
              <Th>Issue</Th>
              <Th>Severity</Th>
              <Th>Why It Matters</Th>
              <Th>Fix Recommendation</Th>
              <Th>Navigate To Fix</Th>
            </TableHead>
            <TBody>
              {openIssues.length === 0 ? (
                <TableEmptyState colSpan={5} message="No open readiness issues. Platform is ready for pilot rollout." />
              ) : (
                openIssues.map((issue) => (
                  <Tr key={issue.key}>
                    <Td>{issue.title}</Td>
                    <Td>
                      <StatusChip
                        label={issue.severity}
                        tone={issue.severity === "critical" ? "danger" : issue.severity === "warning" ? "warning" : "info"}
                        showDot={false}
                      />
                    </Td>
                    <Td className="cs-text-caption cs-text-muted">{issue.why}</Td>
                    <Td className="cs-text-caption">{issue.recommendation}</Td>
                    <Td>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={issue.href}>
                          Open <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>
        </DataTable>
      </PageSection>

      <PageSection>
        <Panel padding="md" className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-[var(--status-operational)]" />
          <p className="cs-text-caption cs-text-muted">
            Dispatch ready status improves automatically as connectors sync, imports complete, and baseline signals
            reach readiness thresholds.
          </p>
        </Panel>
      </PageSection>
    </PageLayout>
  );
}
