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
import type {
  ReadinessHealthIndicator,
  ReadinessIssue,
  ReadinessSnapshot,
} from "@/src/lib/integrations/readiness-service";

export function ImplementationReadinessClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const readinessRes = await fetch("/api/integrations/readiness", { cache: "no-store" });

        if (!readinessRes.ok) throw new Error("Failed to load readiness snapshot.");

        const readinessPayload = (await readinessRes.json()) as {
          implementationProgressPct: number;
          readinessScorePct: number;
          checks: ReadinessSnapshot["checks"];
          counts: ReadinessSnapshot["counts"];
          healthIndicators?: ReadinessHealthIndicator[];
          issues?: ReadinessIssue[];
        };

        if (!active) return;
        setReadiness({
          implementationProgressPct: readinessPayload.implementationProgressPct,
          readinessScorePct: readinessPayload.readinessScorePct,
          checks: readinessPayload.checks ?? [],
          counts: readinessPayload.counts,
          healthIndicators: readinessPayload.healthIndicators ?? [],
          issues: readinessPayload.issues ?? [],
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
    const checkByCode = new Map(readiness?.checks.map((check) => [check.code, check]));
    const indicatorByKey = new Map(
      readiness?.healthIndicators.map((indicator) => [indicator.key, indicator])
    );

    const toStatus = (
      value: "ready" | "warning" | "blocked" | "healthy" | "critical" | undefined
    ): "ready" | "warning" | "blocked" => {
      if (value === "ready" || value === "healthy") return "ready";
      if (value === "critical" || value === "blocked") return "blocked";
      return "warning";
    };

    return [
      {
        label: "GPS",
        status: toStatus(indicatorByKey.get("gps_coverage")?.status),
        detail: indicatorByKey.get("gps_coverage")?.currentStatus ?? "Awaiting GPS coverage signal.",
      },
      {
        label: "Jobs",
        status:
          (readiness?.counts.jobs ?? 0) >= 10
            ? "ready"
            : (readiness?.counts.jobs ?? 0) > 0
              ? "warning"
              : "blocked",
        detail: `${readiness?.counts.jobs ?? 0} job(s) imported`,
      },
      {
        label: "Operators",
        status:
          (readiness?.counts.operators ?? 0) > 0
            ? "ready"
            : (readiness?.counts.importsCompleted ?? 0) > 0
              ? "warning"
              : "blocked",
        detail: `${readiness?.counts.operators ?? 0} operator(s) available`,
      },
      {
        label: "Revenue",
        status: toStatus(indicatorByKey.get("revenue_coverage")?.status),
        detail:
          indicatorByKey.get("revenue_coverage")?.currentStatus ??
          "Revenue coverage not available yet",
      },
      {
        label: "Historical Data",
        status: toStatus(checkByCode.get("historical_data_readiness")?.status),
        detail:
          checkByCode.get("historical_data_readiness")?.detail ??
          "Historical baseline readiness not yet measured",
      },
      {
        label: "Customers",
        status: (readiness?.counts.customers ?? 0) > 0 ? "ready" : "warning",
        detail: `${readiness?.counts.customers ?? 0} customer record(s)`,
      },
      {
        label: "Branches",
        status: (readiness?.counts.branches ?? 0) > 0 ? "ready" : "blocked",
        detail: `${readiness?.counts.branches ?? 0} branch record(s)`,
      },
      {
        label: "Telemetry",
        status: toStatus(indicatorByKey.get("integration_health")?.status),
        detail:
          indicatorByKey.get("integration_health")?.currentStatus ??
          "Connector telemetry readiness unavailable",
      },
      {
        label: "Dispatch Ready",
        status: toStatus(checkByCode.get("dispatch_readiness")?.status),
        detail: checkByCode.get("dispatch_readiness")?.detail ?? "Dispatch readiness unavailable",
      },
      {
        label: "Recommendation Ready",
        status: toStatus(checkByCode.get("recommendation_readiness")?.status),
        detail:
          checkByCode.get("recommendation_readiness")?.detail ??
          "Recommendation readiness unavailable",
      },
    ];
  }, [readiness]);

  const openIssues = useMemo(
    () => (readiness?.issues ?? []).filter((issue) => issue.count > 0),
    [readiness]
  );

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
          title="Operational health indicators"
          description="Current status, why it matters, and destination to fix across pilot-critical domains."
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {(readiness.healthIndicators ?? []).map((indicator) => (
            <Panel key={indicator.key} padding="md" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="cs-text-body font-medium">{indicator.label}</p>
                <StatusChip
                  label={indicator.status}
                  tone={
                    indicator.status === "healthy"
                      ? "success"
                      : indicator.status === "warning"
                        ? "warning"
                        : "danger"
                  }
                  showDot={false}
                />
              </div>
              <p className="cs-text-caption">{indicator.currentStatus}</p>
              <p className="cs-text-caption cs-text-muted">{indicator.whyItMatters}</p>
              <p className="cs-text-caption cs-text-muted">{indicator.recommendedAction}</p>
              <Button asChild variant="ghost" size="sm">
                <Link href={indicator.navigateTo}>
                  Open <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </Panel>
          ))}
        </div>
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
              <Th>Count</Th>
              <Th>Why It Matters</Th>
              <Th>Fix Recommendation</Th>
              <Th>Navigate To Fix</Th>
            </TableHead>
            <TBody>
              {openIssues.length === 0 ? (
                <TableEmptyState colSpan={6} message="No open readiness issues. Platform is ready for pilot rollout." />
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
                    <Td className="font-medium">{issue.count.toLocaleString()}</Td>
                    <Td className="cs-text-caption cs-text-muted">{issue.explanation}</Td>
                    <Td className="cs-text-caption">{issue.recommendedFix}</Td>
                    <Td>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={issue.navigateTo}>
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
