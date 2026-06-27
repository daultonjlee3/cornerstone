"use client";

import { memo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  KpiCard,
  PageSection,
  Panel,
  SectionHeader,
  StatusChip,
} from "@/src/components/design-system";
import type {
  FleetExecutiveInsights,
  FleetMetricDelta,
  FleetRecommendationHistoryEntry,
  FleetRecommendationRoiSummary,
  FleetTodayViewData,
} from "@/src/types/fleet";
import { formatFleetCurrency } from "@/src/lib/fleet/ui/format";
import { RelativeFreshness } from "@/src/components/fleet/ui/fleet-data-freshness";
import { formatRecommendationType } from "./fleet-recommendation-utils";
import { OperationsRecommendationsList } from "./OperationsRecommendationsList";
import { OperationsExceptionQueue } from "./OperationsExceptionQueue";

type FleetOperationsMainBodyProps = {
  data: FleetTodayViewData;
  listsEnabled: boolean;
  secondaryRecommendationCount: number;
  criticalCount: number;
  exceptionTotalCount: number;
  pending: boolean;
  listRefreshKey: number;
  onRecommendationAction: (id: string, action: "accept" | "dismiss") => void;
  recentHistory: FleetRecommendationHistoryEntry[];
  insights: FleetExecutiveInsights | undefined;
  formatDeltaValue: (delta: FleetMetricDelta) => string;
};

export const FleetOperationsMainBody = memo(function FleetOperationsMainBody({
  data,
  listsEnabled,
  secondaryRecommendationCount,
  criticalCount,
  exceptionTotalCount,
  pending,
  listRefreshKey,
  onRecommendationAction,
  recentHistory,
  insights,
  formatDeltaValue,
}: FleetOperationsMainBodyProps) {
  return (
    <>
      <PageSection>
        <div className="grid gap-6 xl:grid-cols-12">
          {secondaryRecommendationCount > 0 ? (
            <OperationsRecommendationsList
              date={data.date}
              enabled={listsEnabled}
              totalCount={secondaryRecommendationCount}
              pending={pending}
              refreshKey={listRefreshKey}
              onAction={onRecommendationAction}
            />
          ) : null}

          <OperationsExceptionQueue
            date={data.date}
            enabled={listsEnabled}
            criticalCount={criticalCount}
            totalCount={exceptionTotalCount}
            refreshKey={listRefreshKey}
            showRecommendationsColumn={secondaryRecommendationCount > 0}
          />
        </div>
      </PageSection>

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

      <PageSection>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <SectionHeader title="Changes since yesterday" />
            {data.changesSinceYesterday.length > 0 ? (
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
            ) : (
              <EmptyState
                title="Day-over-day metrics loading"
                description="Trends appear after background enrichment completes."
              />
            )}
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
              <RecommendationRoiGrid roi={data.recommendationRoi} />
            ) : (
              <EmptyState
                title="No outcomes yet"
                description="Accept recommendations to start measuring ROI this week."
              />
            )}
          </div>
        </div>
      </PageSection>

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
    </>
  );
});

function RecommendationRoiGrid({ roi }: { roi: FleetRecommendationRoiSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <KpiCard
        label="Accepted"
        value={roi.accepted}
        hint={`${roi.acceptanceRate?.toFixed(0) ?? "—"}% rate`}
      />
      <KpiCard
        label="Contribution protected"
        value={formatFleetCurrency(roi.contributionImprovement)}
        emphasis="success"
      />
      <KpiCard
        label="Revenue protected"
        value={formatFleetCurrency(roi.revenueProtected)}
      />
      <KpiCard
        label="Applied / failed"
        value={`${roi.applied} / ${roi.failed}`}
        emphasis={roi.failed > 0 ? "warning" : "default"}
      />
    </div>
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
        {outcome?.acted_at ? <RelativeFreshness iso={outcome.acted_at} /> : "—"}
      </Td>
    </Tr>
  );
}
