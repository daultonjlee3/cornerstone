"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
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

type ConnectorSummary = {
  connector: {
    key: string;
    displayName: string;
    connectorType: string;
    authType: string;
    mappingObjectTypes: string[];
  };
  connection: {
    id: string;
    status: string;
    last_sync_at: string | null;
    config: Record<string, unknown>;
  } | null;
  connectionStatus: string;
  health: {
    status: "healthy" | "warning" | "error" | "not_connected";
    label: string;
    lastSyncAt: string | null;
    reason: string | null;
  };
  syncStats: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    partialRuns: number;
    runningRuns: number;
  };
  credentialMetadata: Record<string, unknown> | null;
  mappingMetadata: Record<string, unknown>;
};

type SyncRun = {
  id: string;
  connection_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  records_processed: number;
  records_failed: number;
  error_summary: string | null;
};

type SyncLog = {
  id: string;
  provider: string;
  operation: string;
  status: "info" | "success" | "warning" | "error";
  duration_ms: number | null;
  error_message: string | null;
  retryable: boolean;
  created_at: string;
};

const TAB_KEYS = [
  "overview",
  "configuration",
  "authentication",
  "mappings",
  "sync_history",
  "logs",
  "health",
  "statistics",
] as const;

type TabKey = (typeof TAB_KEYS)[number];

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

export function ConnectorDetailClient({
  connectorKey,
  canManage,
}: {
  connectorKey: string;
  canManage: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [connector, setConnector] = useState<ConnectorSummary | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [templates, setTemplates] = useState<Array<Record<string, unknown>>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const connectorRes = await fetch(`/api/integrations/connectors/${connectorKey}`, { cache: "no-store" });
        if (!connectorRes.ok) throw new Error("Connector not found.");
        const connectorData = (await connectorRes.json()) as { connector: ConnectorSummary };

        const connectionId = connectorData.connector.connection?.id;
        const [runsRes, logsRes, templatesRes] = await Promise.all([
          fetch(
            `/api/integrations/sync-history?limit=100${connectionId ? `&connection_id=${connectionId}` : ""}`,
            { cache: "no-store" }
          ),
          fetch(`/api/integrations/sync-logs?provider=${connectorData.connector.connector.key}&limit=100`, {
            cache: "no-store",
          }),
          fetch(
            `/api/integrations/import/templates?object_type=${connectorData.connector.connector.mappingObjectTypes[0] ?? "jobs"}`,
            { cache: "no-store" }
          ),
        ]);

        if (!runsRes.ok) throw new Error("Failed to load sync history.");
        if (!logsRes.ok) throw new Error("Failed to load sync logs.");
        if (!templatesRes.ok) throw new Error("Failed to load mapping templates.");

        const runsData = (await runsRes.json()) as { runs: SyncRun[] };
        const logsData = (await logsRes.json()) as { logs: SyncLog[] };
        const templatesData = (await templatesRes.json()) as { templates: Array<Record<string, unknown>> };

        if (!active) return;
        setConnector(connectorData.connector);
        setRuns(runsData.runs ?? []);
        setLogs(logsData.logs ?? []);
        setTemplates(templatesData.templates ?? []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load connector details.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [connectorKey]);

  const runAction = async (mode: "retry" | "disconnect") => {
    if (!connector || !canManage) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "retry") {
        const response = await fetch("/api/integrations/retry-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: connector.connector.key }),
        });
        const data = (await response.json()) as { message?: string; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to retry sync.");
        setMessage(data.message ?? "Retry triggered.");
      } else {
        const response = await fetch(`/api/integrations/connectors/${connector.connector.key}`, {
          method: "DELETE",
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to disconnect.");
        setMessage("Connector disconnected.");
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Connector action failed.");
    } finally {
      setBusy(false);
    }
  };

  const tabContent = useMemo(() => {
    if (!connector) return null;
    const healthTone =
      connector.health.status === "healthy"
        ? "success"
        : connector.health.status === "warning"
          ? "warning"
          : connector.health.status === "error"
            ? "danger"
            : "neutral";

    if (activeTab === "overview") {
      return (
        <Panel padding="md" className="space-y-3">
          <p className="cs-text-body">
            {connector.connector.displayName} is configured as a {connector.connector.connectorType} connector
            using {connector.connector.authType} authentication.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="cs-text-caption cs-text-muted">Status: <StatusBadge status={connector.connectionStatus} /></p>
            <p className="cs-text-caption cs-text-muted">Health: <StatusChip label={connector.health.label} tone={healthTone} /></p>
            <p className="cs-text-caption cs-text-muted">Last Sync: {formatDate(connector.health.lastSyncAt)}</p>
            <p className="cs-text-caption cs-text-muted">Version: v1 (framework)</p>
          </div>
        </Panel>
      );
    }

    if (activeTab === "configuration") {
      return (
        <Panel padding="md" className="space-y-3">
          <p className="cs-text-caption cs-text-muted">Connector configuration metadata</p>
          <pre className="max-h-[320px] overflow-auto rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3 text-xs">
            {JSON.stringify(connector.connection?.config ?? {}, null, 2)}
          </pre>
        </Panel>
      );
    }

    if (activeTab === "authentication") {
      return (
        <Panel padding="md" className="space-y-3">
          <p className="cs-text-caption cs-text-muted">
            Safe credential metadata only — secrets are never returned to client pages.
          </p>
          <pre className="max-h-[240px] overflow-auto rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3 text-xs">
            {JSON.stringify(connector.credentialMetadata ?? { configured: false }, null, 2)}
          </pre>
        </Panel>
      );
    }

    if (activeTab === "mappings") {
      return (
        <Panel padding="md" className="space-y-3">
          <p className="cs-text-caption cs-text-muted">Mapped object types: {connector.connector.mappingObjectTypes.join(", ")}</p>
          {templates.length === 0 ? (
            <EmptyState title="No mapping templates yet" description="Save templates from Import Center mapping workflow." />
          ) : (
            <DataTable>
              <Table>
                <TableHead>
                  <Th>Name</Th>
                  <Th>Object</Th>
                  <Th>Provider</Th>
                  <Th>Created</Th>
                </TableHead>
                <TBody>
                  {templates.map((template) => (
                    <Tr key={String(template.id)}>
                      <Td>{String(template.name ?? "Template")}</Td>
                      <Td>{String(template.object_type ?? "—")}</Td>
                      <Td>{String(template.provider ?? "generic")}</Td>
                      <Td>{formatDate((template.created_at as string | null) ?? null)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </DataTable>
          )}
        </Panel>
      );
    }

    if (activeTab === "sync_history") {
      return (
        <Panel padding="md">
          <DataTable>
            <Table>
              <TableHead>
                <Th>Started</Th>
                <Th>Finished</Th>
                <Th>Status</Th>
                <Th>Rows</Th>
                <Th>Errors</Th>
              </TableHead>
              <TBody>
                {runs.length === 0 ? (
                  <TableEmptyState colSpan={5} message="No sync history recorded yet." />
                ) : (
                  runs.map((run) => (
                    <Tr key={run.id}>
                      <Td>{formatDate(run.started_at)}</Td>
                      <Td>{formatDate(run.finished_at)}</Td>
                      <Td><StatusBadge status={run.status} /></Td>
                      <Td>{run.records_processed}</Td>
                      <Td>{run.records_failed}</Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </DataTable>
        </Panel>
      );
    }

    if (activeTab === "logs") {
      return (
        <Panel padding="md">
          <DataTable>
            <Table>
              <TableHead>
                <Th>Timestamp</Th>
                <Th>Operation</Th>
                <Th>Status</Th>
                <Th>Duration</Th>
                <Th>Retry</Th>
              </TableHead>
              <TBody>
                {logs.length === 0 ? (
                  <TableEmptyState colSpan={5} message="No logs available." />
                ) : (
                  logs.map((log) => (
                    <Tr key={log.id}>
                      <Td>{formatDate(log.created_at)}</Td>
                      <Td>{log.operation}</Td>
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
                      <Td>{log.duration_ms ? `${log.duration_ms}ms` : "—"}</Td>
                      <Td>{log.retryable ? "Retryable" : "—"}</Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </DataTable>
        </Panel>
      );
    }

    if (activeTab === "health") {
      return (
        <Panel padding="md" className="space-y-2">
          <StatusChip label={connector.health.label} tone={healthTone} />
          <p className="cs-text-caption cs-text-muted">{connector.health.reason ?? "No active health issues reported."}</p>
          <p className="cs-text-caption cs-text-muted">Last sync: {formatDate(connector.health.lastSyncAt)}</p>
        </Panel>
      );
    }

    return (
      <Panel padding="md" className="space-y-2">
        <p className="cs-text-caption cs-text-muted">Sync statistics</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="cs-text-caption">Total runs: {connector.syncStats.totalRuns}</p>
          <p className="cs-text-caption">Successful runs: {connector.syncStats.successfulRuns}</p>
          <p className="cs-text-caption">Partial runs: {connector.syncStats.partialRuns}</p>
          <p className="cs-text-caption">Failed runs: {connector.syncStats.failedRuns}</p>
        </div>
      </Panel>
    );
  }, [activeTab, connector, logs, runs, templates]);

  if (loading) {
    return (
      <PageLayout>
        <PageSection>
          <Panel padding="md">
            <SkeletonText lines={7} />
          </Panel>
        </PageSection>
      </PageLayout>
    );
  }

  if (error || !connector) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-5" />}
        title="Connector details unavailable"
        description={error ?? "Unable to load connector details."}
        action={
          <Button asChild>
            <Link href="/implementation/connections">Back to connections</Link>
          </Button>
        }
      />
    );
  }

  return (
    <PageLayout>
      <PageSection>
        <SectionHeader
          eyebrow="Connector details"
          title={connector.connector.displayName}
          description="Overview, configuration, authentication, mappings, sync history, logs, health, and statistics."
          action={
            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/implementation/connections">
                  <ArrowLeft className="size-3.5" /> Back
                </Link>
              </Button>
              {canManage ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => runAction("retry")} disabled={busy}>
                  <RefreshCw className="size-3.5" /> Retry Failed Sync
                </Button>
              ) : null}
              {canManage ? (
                <Button type="button" variant="danger" size="sm" onClick={() => runAction("disconnect")} disabled={busy}>
                  <Trash2 className="size-3.5" /> Disconnect
                </Button>
              ) : null}
            </div>
          }
        />

        {message ? (
          <Panel
            padding="sm"
            className="mb-3 border-[color-mix(in_srgb,var(--status-success)_25%,transparent)] bg-[var(--status-success-subtle)]"
          >
            <p className="cs-text-caption text-[var(--status-success)]">{message}</p>
          </Panel>
        ) : null}
        {error ? (
          <Panel
            padding="sm"
            className="mb-3 border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)] bg-[var(--status-danger-subtle)]"
          >
            <p className="cs-text-caption text-[var(--status-danger)]">{error}</p>
          </Panel>
        ) : null}

        <div className="mb-3 flex flex-wrap gap-2">
          {TAB_KEYS.map((tab) => (
            <Button
              key={tab}
              type="button"
              size="sm"
              variant={activeTab === tab ? "primary" : "secondary"}
              onClick={() => setActiveTab(tab)}
            >
              {tab.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
        {tabContent}
      </PageSection>
    </PageLayout>
  );
}
