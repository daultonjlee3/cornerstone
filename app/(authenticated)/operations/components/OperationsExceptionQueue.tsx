"use client";

import { CheckCircle2 } from "lucide-react";
import {
  DataTable,
  Table,
  Th,
  TBody,
} from "@/src/components/ui/data-table";
import { EmptyState, SectionHeader, StatusChip } from "@/src/components/design-system";
import type { FleetOperationalException } from "@/src/types/fleet";
import { useOperationsPaginatedList } from "./useOperationsPaginatedList";
import { OperationsScrollSection } from "./OperationsScrollSection";
import { ExceptionTableRow } from "./operations-list-rows";

type OperationsExceptionQueueProps = {
  date: string;
  enabled: boolean;
  criticalCount: number;
  totalCount: number;
  refreshKey: number;
  showRecommendationsColumn: boolean;
};

function ExceptionsSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--surface-border-subtle)]" />
      ))}
    </div>
  );
}

export function OperationsExceptionQueue({
  date,
  enabled,
  criticalCount,
  totalCount,
  refreshKey,
  showRecommendationsColumn,
}: OperationsExceptionQueueProps) {
  const { items, hasMore, loading, initialLoading, error, refresh, sentinelRef } =
    useOperationsPaginatedList<FleetOperationalException>({
      endpoint: "/api/fleet/operations/exceptions",
      date,
      pageSize: 10,
      enabled,
      resetKey: refreshKey,
    });

  return (
    <div
      id="fleet-exceptions"
      className={`scroll-mt-6 space-y-4 ${showRecommendationsColumn ? "xl:col-span-7" : "xl:col-span-12"}`}
    >
      <SectionHeader
        title="Exception queue"
        description={
          totalCount > 0
            ? `${totalCount} issue${totalCount === 1 ? "" : "s"} need attention`
            : "Issues that need attention before they become costly."
        }
        action={
          criticalCount > 0 ? (
            <StatusChip label={`${criticalCount} critical`} tone="danger" />
          ) : null
        }
      />
      <OperationsScrollSection
        ariaLabel="Exception queue"
        hasMore={hasMore}
        loading={loading}
        initialLoading={initialLoading}
        error={error}
        onRetry={() => void refresh()}
        sentinelRef={sentinelRef}
        empty={
          !initialLoading && totalCount === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="size-7 text-[var(--status-success)]" />}
              title="No exceptions"
              description="No operational exceptions detected for today."
            />
          ) : undefined
        }
        skeleton={<ExceptionsSkeleton />}
      >
        <DataTable className="shadow-none">
          <Table className="min-w-[520px]">
            <thead className="sticky top-0 z-10 bg-[var(--surface-base)] shadow-[0_1px_0_var(--surface-border-subtle)]">
              <tr className="border-b border-[var(--surface-border-subtle)] cs-text-micro cs-text-muted">
                <Th>Severity</Th>
                <Th>Issue</Th>
                <Th>Recommended action</Th>
                <Th className="w-24">Action</Th>
              </tr>
            </thead>
            <TBody>
              {items.map((ex) => (
                <ExceptionTableRow key={ex.id} exception={ex} />
              ))}
            </TBody>
          </Table>
        </DataTable>
      </OperationsScrollSection>
    </div>
  );
}
