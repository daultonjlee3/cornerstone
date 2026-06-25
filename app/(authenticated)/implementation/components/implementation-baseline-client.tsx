"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3 } from "lucide-react";
import {
  EmptyState,
  KpiCard,
  PageLayout,
  PageSection,
  Panel,
  SectionHeader,
  SkeletonKpiGrid,
  StatusChip,
} from "@/src/components/design-system";

type BaselineMetric = {
  key: string;
  label: string;
  value: number;
  unit: "currency" | "ratio" | "hours" | "miles" | "count";
  estimated: boolean;
};

type BaselineSnapshot = {
  windowDays: number;
  fromDate: string;
  toDate: string;
  metrics: BaselineMetric[];
};

const WINDOWS = [30, 60, 90, 180, 365] as const;

function formatMetric(metric: BaselineMetric): string {
  if (metric.unit === "currency") return `$${metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (metric.unit === "ratio") return `${(metric.value * 100).toFixed(1)}%`;
  if (metric.unit === "hours") return `${metric.value.toFixed(2)}h`;
  if (metric.unit === "miles") return `${metric.value.toFixed(1)} mi`;
  return metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function helpText(metric: BaselineMetric): string {
  switch (metric.key) {
    case "revenue_per_truck":
      return "Average revenue per active truck for selected lookback.";
    case "jobs_per_truck":
      return "Completed jobs divided by active truck count.";
    case "utilization":
      return "Billable hours over available hours.";
    case "deadhead":
      return "Share of non-billable distance between assignments.";
    case "average_drive_time":
      return "Average drive time per completed run.";
    case "contribution":
      return "Revenue minus variable operating costs.";
    case "revenue_per_hour":
      return "Revenue generated per billable hour.";
    case "branch_utilization":
      return "Average branch throughput relative to capacity.";
    case "operator_utilization":
      return "Average operator billable utilization.";
    default:
      return "Derived baseline metric.";
  }
}

export function ImplementationBaselineClient() {
  const [windowDays, setWindowDays] = useState<number>(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<BaselineSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/integrations/baseline?window_days=${windowDays}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load baseline metrics.");
        const data = (await response.json()) as BaselineSnapshot;
        if (!active) return;
        setSnapshot(data);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load baseline metrics.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [windowDays]);

  const allZero = useMemo(
    () => (snapshot?.metrics ?? []).every((metric) => metric.value === 0),
    [snapshot]
  );

  if (loading) {
    return (
      <PageLayout>
        <PageSection>
          <SkeletonKpiGrid count={9} />
        </PageSection>
      </PageLayout>
    );
  }

  if (error || !snapshot) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-5" />}
        title="Baseline metrics unavailable"
        description={error ?? "Unable to load baseline data."}
      />
    );
  }

  return (
    <PageLayout>
      <PageSection>
        <SectionHeader
          title="Historical baseline"
          description="Professional KPI dashboard for baseline readiness and value benchmarking."
          action={
            <select
              className="ui-select w-[170px]"
              value={windowDays}
              onChange={(event) => setWindowDays(Number(event.target.value))}
              aria-label="Baseline lookback window"
            >
              {WINDOWS.map((window) => (
                <option key={window} value={window}>
                  {window} days
                </option>
              ))}
            </select>
          }
        />
        <Panel padding="md" className="mb-3 flex flex-wrap items-center gap-2">
          <StatusChip label={`Window ${snapshot.windowDays} days`} tone="info" showDot={false} />
          <StatusChip label={`From ${snapshot.fromDate}`} tone="neutral" showDot={false} />
          <StatusChip label={`To ${snapshot.toDate}`} tone="neutral" showDot={false} />
          <StatusChip label="Estimated values are labeled per card" tone="warning" showDot={false} />
        </Panel>
        {allZero ? (
          <EmptyState
            icon={<BarChart3 className="size-5" />}
            title="No historical baseline data yet"
            description="Import historical jobs, telematics, and revenue data before generating KPI baselines."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {snapshot.metrics.map((metric) => (
              <div key={metric.key} className="space-y-2">
                <KpiCard
                  label={metric.label}
                  value={formatMetric(metric)}
                  hint={helpText(metric)}
                  emphasis={metric.estimated ? "warning" : "operational"}
                />
                {metric.estimated ? (
                  <StatusChip label="Estimated" tone="warning" showDot={false} />
                ) : (
                  <StatusChip label="Measured" tone="success" showDot={false} />
                )}
              </div>
            ))}
          </div>
        )}
      </PageSection>
      <PageSection>
        <Panel padding="md">
          <p className="cs-text-caption cs-text-muted">
            Baseline KPIs use tenant-scoped utilization/job data and are intended for onboarding readiness. Estimated
            metrics are heuristics and should be validated against live dispatch data before executive reporting.
          </p>
        </Panel>
      </PageSection>
    </PageLayout>
  );
}
