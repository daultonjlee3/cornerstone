"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Plug, RefreshCw, Settings2, ShieldCheck, Unplug } from "lucide-react";
import {
  EmptyState,
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
  errorState: string | null;
};

const PROVIDER_ORDER = [
  "samsara",
  "geotab",
  "motive",
  "fleetio",
  "quickbooks",
  "csv",
  "rest_api",
  "webhook",
] as const;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

export function ImplementationConnectionsClient({ canManage }: { canManage: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/integrations/connectors", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load connectors.");
        const data = (await response.json()) as { connectors: ConnectorSummary[] };
        if (!active) return;
        const sorted = [...(data.connectors ?? [])].sort(
          (a, b) =>
            PROVIDER_ORDER.indexOf(a.connector.key as (typeof PROVIDER_ORDER)[number]) -
            PROVIDER_ORDER.indexOf(b.connector.key as (typeof PROVIDER_ORDER)[number])
        );
        setConnectors(sorted);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load connector data.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      connectors.filter((entry) => {
        const haystack = `${entry.connector.displayName} ${entry.connector.connectorType} ${entry.connector.authType}`;
        return haystack.toLowerCase().includes(search.trim().toLowerCase());
      }),
    [connectors, search]
  );

  const counts = useMemo(() => {
    const connected = connectors.filter((entry) => entry.connectionStatus !== "not_connected").length;
    const healthy = connectors.filter((entry) => entry.health.status === "healthy").length;
    const needsAttention = connectors.filter(
      (entry) => entry.health.status === "warning" || entry.health.status === "error"
    ).length;
    const totalRuns = connectors.reduce((sum, entry) => sum + entry.syncStats.totalRuns, 0);
    return { connected, healthy, needsAttention, totalRuns };
  }, [connectors]);

  const mutateConnector = async (key: string, mode: "connect" | "disconnect" | "retry") => {
    setPendingKey(key);
    setMessage(null);
    setError(null);
    try {
      if (mode === "connect") {
        const response = await fetch("/api/integrations/connectors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to connect.");
        setMessage("Connector configured.");
      } else if (mode === "disconnect") {
        const response = await fetch(`/api/integrations/connectors/${key}`, { method: "DELETE" });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to disconnect.");
        setMessage("Connector disconnected.");
      } else {
        const response = await fetch("/api/integrations/retry-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const data = (await response.json()) as { message?: string; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to retry sync.");
        setMessage(data.message ?? "Retry triggered.");
      }

      const refreshed = await fetch("/api/integrations/connectors", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("Failed to refresh connector state.");
      const refreshedData = (await refreshed.json()) as { connectors: ConnectorSummary[] };
      setConnectors(refreshedData.connectors ?? []);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Connector action failed.");
    } finally {
      setPendingKey(null);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <PageSection>
          <SkeletonKpiGrid count={4} />
        </PageSection>
        <PageSection>
          <Panel padding="md">
            <SkeletonText lines={6} />
          </Panel>
        </PageSection>
      </PageLayout>
    );
  }

  if (error && connectors.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-5" />}
        title="Connections unavailable"
        description={error}
        action={
          <Button type="button" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <PageLayout>
      <PageSection>
        <SectionHeader
          title="Connection health"
          description="Enterprise connector cards with status, health, sync activity, and operational actions."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Connected" value={counts.connected} hint="Configured connectors" emphasis="operational" />
          <KpiCard label="Healthy" value={counts.healthy} hint="Healthy connectors" emphasis="success" />
          <KpiCard
            label="Needs Attention"
            value={counts.needsAttention}
            hint="Warning + error connectors"
            emphasis={counts.needsAttention > 0 ? "warning" : "default"}
          />
          <KpiCard label="Sync Runs" value={counts.totalRuns} hint="Total recorded sync runs" />
        </div>
      </PageSection>

      {error ? (
        <PageSection>
          <Panel
            padding="sm"
            className="border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)] bg-[var(--status-danger-subtle)]"
          >
            <p className="cs-text-body text-[var(--status-danger)]">{error}</p>
          </Panel>
        </PageSection>
      ) : null}

      {message ? (
        <PageSection>
          <Panel
            padding="sm"
            className="border-[color-mix(in_srgb,var(--status-success)_25%,transparent)] bg-[var(--status-success-subtle)]"
          >
            <p className="cs-text-body text-[var(--status-success)]">{message}</p>
          </Panel>
        </PageSection>
      ) : null}

      <PageSection>
        <SectionHeader
          title="Connector cards"
          description="Use Connect, Configure, Details, Retry, and Disconnect to manage onboarding readiness."
          action={
            <input
              className="ui-input w-[240px]"
              placeholder="Search connectors"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search connectors"
            />
          }
        />
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Plug className="size-5" />}
            title="No connectors match your search"
            description="Try another provider name, connector type, or auth type."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((entry) => {
              const isConnected = entry.connectionStatus !== "not_connected";
              const isBusy = pendingKey === entry.connector.key;
              return (
                <Panel key={entry.connector.key} padding="md" className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="cs-text-section-title">{entry.connector.displayName}</p>
                      <p className="cs-text-caption cs-text-muted">
                        {entry.connector.connectorType} · {entry.connector.authType}
                      </p>
                    </div>
                    <StatusChip
                      label={entry.health.label}
                      tone={
                        entry.health.status === "healthy"
                          ? "success"
                          : entry.health.status === "warning"
                            ? "warning"
                            : entry.health.status === "error"
                              ? "danger"
                              : "neutral"
                      }
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p className="cs-text-caption cs-text-muted">Status: <StatusBadge status={entry.connectionStatus} /></p>
                    <p className="cs-text-caption cs-text-muted">Last Sync: {formatDate(entry.health.lastSyncAt)}</p>
                    <p className="cs-text-caption cs-text-muted">Rows Synced (runs): {entry.syncStats.successfulRuns}</p>
                    <p className="cs-text-caption cs-text-muted">
                      Recommended Action:{" "}
                      {isConnected
                        ? entry.health.status === "healthy"
                          ? "Review details"
                          : "Retry sync"
                        : "Connect provider"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => mutateConnector(entry.connector.key, "connect")}
                        disabled={isBusy || isConnected}
                      >
                        <Plug className="size-3.5" /> Connect
                      </Button>
                    ) : null}
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/implementation/connections/${entry.connector.key}`}>
                        <Settings2 className="size-3.5" /> Configure
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/implementation/connections/${entry.connector.key}`}>
                        <ArrowUpRight className="size-3.5" /> Details
                      </Link>
                    </Button>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => mutateConnector(entry.connector.key, "retry")}
                        disabled={isBusy}
                      >
                        <RefreshCw className="size-3.5" /> Retry
                      </Button>
                    ) : null}
                    {canManage ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => mutateConnector(entry.connector.key, "disconnect")}
                        disabled={isBusy || !isConnected}
                      >
                        <Unplug className="size-3.5" /> Disconnect
                      </Button>
                    ) : null}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </PageSection>

      <PageSection>
        <SectionHeader
          title="Connections table"
          description="Operational view of configured connectors and current health."
        />
        <DataTable>
          <Table className="min-w-[860px]">
            <TableHead>
              <Th>Connector</Th>
              <Th>Status</Th>
              <Th>Health</Th>
              <Th>Last Sync</Th>
              <Th>Auth</Th>
              <Th>Sync Runs</Th>
              <Th>Actions</Th>
            </TableHead>
            <TBody>
              {filtered.length === 0 ? (
                <TableEmptyState colSpan={7} message="No connectors found." />
              ) : (
                filtered.map((entry) => (
                  <Tr key={`row-${entry.connector.key}`}>
                    <Td>{entry.connector.displayName}</Td>
                    <Td><StatusBadge status={entry.connectionStatus} /></Td>
                    <Td>
                      <StatusChip
                        label={entry.health.label}
                        tone={
                          entry.health.status === "healthy"
                            ? "success"
                            : entry.health.status === "warning"
                              ? "warning"
                              : entry.health.status === "error"
                                ? "danger"
                                : "neutral"
                        }
                        showDot={false}
                      />
                    </Td>
                    <Td className="cs-text-caption cs-text-muted">{formatDate(entry.health.lastSyncAt)}</Td>
                    <Td className="cs-text-caption">{entry.connector.authType}</Td>
                    <Td className="cs-text-caption">{entry.syncStats.totalRuns}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/implementation/connections/${entry.connector.key}`}>Details</Link>
                        </Button>
                        {canManage ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => mutateConnector(entry.connector.key, "retry")}
                            disabled={pendingKey === entry.connector.key}
                          >
                            <ShieldCheck className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>
        </DataTable>
      </PageSection>
    </PageLayout>
  );
}
