"use client";

import { useMemo } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { EmptyState, StatusChip } from "@/src/components/design-system";
import { RelativeFreshness } from "@/src/components/fleet/ui/fleet-data-freshness";
import type { FleetInsightColumn, FleetInsightRecord } from "@/src/lib/fleet/insights/types";
import { getFleetKpiRegistryEntry } from "@/src/lib/fleet/insights/kpi-registry";
import { INSIGHT_TABS, type FleetInsightPanelProps } from "./index";
import "./fleet-insight-panel.css";

function trendTone(direction: string): "success" | "danger" | "neutral" | "warning" {
  if (direction === "improved") return "success";
  if (direction === "declined") return "danger";
  if (direction === "unchanged") return "neutral";
  return "warning";
}

function filterRecords(records: FleetInsightRecord[], search: string): FleetInsightRecord[] {
  if (!search.trim()) return records;
  const q = search.trim().toLowerCase();
  return records.filter((row) =>
    Object.values(row).some((v) => v != null && String(v).toLowerCase().includes(q))
  );
}

function InsightSkeleton() {
  return (
    <div className="fleet-insight-panel__skeleton" aria-hidden>
      <div className="fleet-insight-panel__skeleton-bar" style={{ width: "70%" }} />
      <div className="fleet-insight-panel__skeleton-bar" style={{ width: "100%" }} />
      <div className="fleet-insight-panel__skeleton-bar" style={{ width: "90%" }} />
      <div className="fleet-insight-panel__skeleton-bar" style={{ width: "100%", height: "4rem" }} />
    </div>
  );
}

function RecordsTable({ columns, records }: { columns: FleetInsightColumn[]; records: FleetInsightRecord[] }) {
  if (records.length === 0) {
    return <EmptyState title="No records" description="Nothing matches your filters for this KPI." />;
  }
  return (
    <DataTable>
      <Table className="min-w-[280px]">
        <TableHead>
          <tr>
            {columns.map((col) => (
              <Th key={col.key} className={col.align === "right" ? "text-right" : undefined}>
                {col.label}
              </Th>
            ))}
          </tr>
        </TableHead>
        <TBody>
          {records.map((row, index) => (
            <Tr key={String(row.id ?? index)}>
              {columns.map((col) => (
                <Td key={col.key} className={col.align === "right" ? "text-right tabular-nums" : undefined}>
                  {row[col.key] ?? "—"}
                </Td>
              ))}
            </Tr>
          ))}
        </TBody>
      </Table>
    </DataTable>
  );
}

export function FleetInsightPanel({
  kpiId,
  payload,
  loading,
  error,
  activeTab,
  onTabChange,
  onClose,
  search,
  onSearchChange,
  onAction,
}: FleetInsightPanelProps) {
  const registry = getFleetKpiRegistryEntry(kpiId);
  const title = payload?.title ?? registry.title;
  const description = payload?.description ?? registry.description;

  const filteredRecords = useMemo(
    () => filterRecords(payload?.records ?? [], search),
    [payload?.records, search]
  );
  const filteredHistory = useMemo(
    () => filterRecords(payload?.history ?? [], search),
    [payload?.history, search]
  );

  return (
    <aside
      className="fleet-insight-panel fleet-insight-panel--enter"
      aria-label={title}
      data-testid="fleet-insight-panel"
    >
      <div className="fleet-insight-panel__header">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="cs-text-eyebrow cs-text-muted">{title}</p>
            <p className="cs-text-section-title truncate">{description}</p>
            {payload ? (
              <p className="cs-text-caption cs-text-muted mt-1">
                Updated <RelativeFreshness iso={payload.lastUpdated} />
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 shrink-0 p-0"
            onClick={onClose}
            aria-label="Close insight panel"
          >
            <X className="size-4" />
          </Button>
        </div>

        {payload ? (
          <div className="fleet-insight-panel__primary">
            <div>
              <p className="fleet-insight-panel__primary-value">{payload.primaryValue}</p>
              <p className="cs-text-caption cs-text-muted">{payload.primaryLabel}</p>
            </div>
            {payload.trend ? (
              <StatusChip
                label={[payload.trend.label, payload.trend.value].filter(Boolean).join(" ")}
                tone={trendTone(payload.trend.direction)}
                showDot={false}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="fleet-insight-panel__tabs" role="tablist">
        {INSIGHT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`fleet-insight-panel__tab ${activeTab === tab.id ? "fleet-insight-panel__tab--active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="fleet-insight-panel__body">
        {loading ? <InsightSkeleton /> : null}
        {!loading && error ? <EmptyState title="Unable to load insight" description={error} /> : null}

        {!loading && !error && payload && activeTab === "overview" ? (
          <div className="space-y-3">
            <div className="fleet-insight-panel__summary-grid">
              {payload.summary.map((item) => (
                <div key={item.label} className="fleet-insight-panel__summary-item">
                  <p className="cs-text-micro cs-text-muted">{item.label}</p>
                  <p className="cs-text-body font-semibold mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
            {payload.groups && payload.groups.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {payload.groups.map((g) => (
                  <StatusChip key={g.id} label={`${g.label} (${g.count})`} tone="neutral" showDot={false} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && payload && activeTab === "records" ? (
          <>
            <input
              type="search"
              className="fleet-insight-panel__search"
              placeholder="Search records…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search records"
            />
            <RecordsTable columns={payload.columns} records={filteredRecords} />
          </>
        ) : null}

        {!loading && !error && payload && activeTab === "recommendations" ? (
          <div className="space-y-2">
            {payload.recommendations.length === 0 ? (
              <EmptyState title="No recommendations" description="The engine has no pending actions for this KPI." />
            ) : (
              payload.recommendations.map((rec) => (
                <div key={rec.id} className="rounded-lg border border-[var(--surface-border-subtle)] px-3 py-2.5">
                  <p className="cs-text-caption font-medium">{rec.title}</p>
                  <p className="cs-text-micro cs-text-muted mt-0.5">{rec.detail}</p>
                  {rec.href ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2 h-7 text-xs"
                      onClick={() => onAction(rec.href!)}
                    >
                      Review
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : null}

        {!loading && !error && payload && activeTab === "history" ? (
          payload.history.length === 0 ? (
            <EmptyState title="No history" description="Recent decisions will appear here." />
          ) : (
            <>
              <input
                type="search"
                className="fleet-insight-panel__search"
                placeholder="Search history…"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search history"
              />
              <RecordsTable columns={payload.historyColumns} records={filteredHistory} />
            </>
          )
        ) : null}
      </div>

      {payload ? (
        <div className="fleet-insight-panel__footer">
          <p className="cs-text-micro cs-text-muted">Estimated impact</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {payload.impactSummary.estimatedImpact ? (
              <StatusChip label={payload.impactSummary.estimatedImpact} tone="info" showDot={false} />
            ) : null}
            {payload.impactSummary.revenueProtected ? (
              <StatusChip label={`Protected ${payload.impactSummary.revenueProtected}`} tone="success" showDot={false} />
            ) : null}
            {payload.impactSummary.timeSaved ? (
              <StatusChip label={`Saved ${payload.impactSummary.timeSaved}`} tone="operational" showDot={false} />
            ) : null}
          </div>
          <div className="fleet-insight-panel__actions">
            {payload.actions.map((action) => (
              <Button key={action.id} type="button" size="sm" variant="secondary" className="h-7 text-xs" asChild>
                <Link
                  href={action.href}
                  onClick={(e) => {
                    e.preventDefault();
                    onAction(action.href);
                  }}
                >
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
