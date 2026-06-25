"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  EmptyState,
  PageLayout,
  PageSection,
  Panel,
  SectionHeader,
  SkeletonText,
  StatusChip,
} from "@/src/components/design-system";
import { Button } from "@/src/components/ui/button";
import { Pagination } from "@/src/components/ui/pagination";
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
import { StatusBadge } from "@/src/components/ui/status-badge";

type SyncRun = {
  id: string;
  connection_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: string;
  records_processed: number;
  records_failed: number;
  error_summary: string | null;
};

type SyncLog = {
  id: string;
  connection_id: string | null;
  provider: string;
  operation: string;
  status: "info" | "success" | "warning" | "error";
  duration_ms: number | null;
  error_message: string | null;
  retryable: boolean;
  created_at: string;
};

type ConnectorSummary = {
  connector: { key: string; displayName: string };
  connection: { id: string } | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

function duration(startedAt: string, finishedAt: string | null): string {
  const start = Date.parse(startedAt);
  const end = finishedAt ? Date.parse(finishedAt) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "—";
  const ms = Math.max(0, end - start);
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  return `${sec}s`;
}

export function ImplementationSyncHistoryClient({ canManage }: { canManage: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [runsPage, setRunsPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [runsRes, logsRes, connectorsRes] = await Promise.all([
          fetch("/api/integrations/sync-history?limit=200", { cache: "no-store" }),
          fetch("/api/integrations/sync-logs?limit=250", { cache: "no-store" }),
          fetch("/api/integrations/connectors", { cache: "no-store" }),
        ]);
        if (!runsRes.ok) throw new Error("Failed to load sync history.");
        if (!logsRes.ok) throw new Error("Failed to load sync logs.");
        if (!connectorsRes.ok) throw new Error("Failed to load connectors.");
        const runsData = (await runsRes.json()) as { runs: SyncRun[] };
        const logsData = (await logsRes.json()) as { logs: SyncLog[] };
        const connectorsData = (await connectorsRes.json()) as { connectors: ConnectorSummary[] };
        if (!active) return;
        setRuns(runsData.runs ?? []);
        setLogs(logsData.logs ?? []);
        setConnectors(connectorsData.connectors ?? []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load sync activity.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const connectorByConnection = useMemo(() => {
    const map = new Map<string, string>();
    connectors.forEach((entry) => {
      if (entry.connection?.id) map.set(entry.connection.id, entry.connector.displayName);
    });
    return map;
  }, [connectors]);

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const connectorName = run.connection_id ? connectorByConnection.get(run.connection_id) ?? "Unknown" : "Unknown";
      const haystack = `${connectorName} ${run.status} ${run.error_summary ?? ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || run.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [connectorByConnection, runs, search, statusFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const haystack = `${log.provider} ${log.operation} ${log.status} ${log.error_message ?? ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [logs, search, statusFilter]);

  const runsPageSize = 12;
  const logsPageSize = 12;
  const pagedRuns = filteredRuns.slice((runsPage - 1) * runsPageSize, runsPage * runsPageSize);
  const pagedLogs = filteredLogs.slice((logsPage - 1) * logsPageSize, logsPage * logsPageSize);

  const retryRun = async (run: SyncRun) => {
    if (!canManage || !run.connection_id) return;
    const connector = connectors.find((entry) => entry.connection?.id === run.connection_id);
    if (!connector) return;
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/integrations/retry-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: connector.connector.key }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "Retry failed.");
      setMessage(data.message ?? "Retry started.");
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Retry failed.");
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <PageSection>
          <Panel padding="md">
            <SkeletonText lines={8} />
          </Panel>
        </PageSection>
      </PageLayout>
    );
  }

  if (error && runs.length === 0 && logs.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-5" />}
        title="Sync history unavailable"
        description={error}
      />
    );
  }

  return (
    <PageLayout>
      <PageSection>
        <SectionHeader
          title="Sync history"
          description="Search, filter, and retry connector sync runs."
          action={
            <div className="flex flex-wrap gap-2">
              <input
                className="ui-input w-[220px]"
                placeholder="Search connector/status/errors"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search sync history"
              />
              <select
                className="ui-select w-[160px]"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter sync status"
              >
                <option value="all">All statuses</option>
                <option value="running">running</option>
                <option value="success">success</option>
                <option value="partial">partial</option>
                <option value="failed">failed</option>
                <option value="info">info</option>
                <option value="warning">warning</option>
                <option value="error">error</option>
              </select>
            </div>
          }
        />

        {error ? (
          <Panel
            padding="sm"
            className="mb-3 border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)] bg-[var(--status-danger-subtle)]"
          >
            <p className="cs-text-caption text-[var(--status-danger)]">{error}</p>
          </Panel>
        ) : null}
        {message ? (
          <Panel
            padding="sm"
            className="mb-3 border-[color-mix(in_srgb,var(--status-success)_25%,transparent)] bg-[var(--status-success-subtle)]"
          >
            <p className="cs-text-caption text-[var(--status-success)]">{message}</p>
          </Panel>
        ) : null}

        <DataTable>
          <Table className="min-w-[1080px]">
            <TableHead>
              <Th>Connector</Th>
              <Th>Started</Th>
              <Th>Finished</Th>
              <Th>Duration</Th>
              <Th>Rows</Th>
              <Th>Status</Th>
              <Th>Errors</Th>
              <Th>Retry</Th>
            </TableHead>
            <TBody>
              {pagedRuns.length === 0 ? (
                <TableEmptyState colSpan={8} message="No sync runs found for current filters." />
              ) : (
                pagedRuns.map((run) => (
                  <Tr key={run.id}>
                    <Td>{run.connection_id ? connectorByConnection.get(run.connection_id) ?? "Unknown" : "Unknown"}</Td>
                    <Td>{formatDate(run.started_at)}</Td>
                    <Td>{formatDate(run.finished_at)}</Td>
                    <Td>{duration(run.started_at, run.finished_at)}</Td>
                    <Td>{run.records_processed + run.records_failed}</Td>
                    <Td><StatusBadge status={run.status} /></Td>
                    <Td className="max-w-[220px] truncate cs-text-caption cs-text-muted">{run.error_summary ?? "—"}</Td>
                    <Td>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={run.status !== "failed"}
                          onClick={() => void retryRun(run)}
                        >
                          Retry
                        </Button>
                      ) : (
                        <StatusChip label="Read only" tone="neutral" showDot={false} />
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>
          <Pagination
            page={runsPage}
            pageSize={runsPageSize}
            totalCount={filteredRuns.length}
            onPageChange={setRunsPage}
          />
        </DataTable>
      </PageSection>

      <PageSection>
        <SectionHeader title="Sync logs" description="Operational logs with status badges and retry indicators." />
        <DataTable>
          <Table className="min-w-[980px]">
            <TableHead>
              <Th>Timestamp</Th>
              <Th>Connector</Th>
              <Th>Operation</Th>
              <Th>Duration</Th>
              <Th>Status</Th>
              <Th>Error</Th>
              <Th>Retryable</Th>
            </TableHead>
            <TBody>
              {pagedLogs.length === 0 ? (
                <TableEmptyState colSpan={7} message="No sync logs found for current filters." />
              ) : (
                pagedLogs.map((log) => (
                  <Tr key={log.id}>
                    <Td>{formatDate(log.created_at)}</Td>
                    <Td>{log.provider}</Td>
                    <Td>{log.operation}</Td>
                    <Td>{log.duration_ms ? `${log.duration_ms}ms` : "—"}</Td>
                    <Td>
                      <StatusChip
                        label={log.status}
                        tone={
                          log.status === "success"
                            ? "success"
                            : log.status === "warning"
                              ? "warning"
                              : log.status === "error"
                                ? "danger"
                                : "info"
                        }
                        showDot={false}
                      />
                    </Td>
                    <Td className="max-w-[220px] truncate cs-text-caption cs-text-muted">{log.error_message ?? "—"}</Td>
                    <Td>{log.retryable ? "Yes" : "No"}</Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>
          <Pagination
            page={logsPage}
            pageSize={logsPageSize}
            totalCount={filteredLogs.length}
            onPageChange={setLogsPage}
          />
        </DataTable>
      </PageSection>
    </PageLayout>
  );
}
