"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Link2,
  Plug,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Unplug,
} from "lucide-react";
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
import {
  CONNECTED_SYSTEMS_CATEGORIES,
  type ConnectorOperationalCategory,
} from "@/src/lib/integrations/connector-catalog";

type ConnectorSummary = {
  connector: {
    key: string;
    displayName: string;
    category: ConnectorOperationalCategory;
    connectorType: string;
    providerType: string;
    authType: string;
    status: "available" | "coming_soon";
    description: string;
    primaryDataDomains: string[];
    capabilities: string[];
    syncDirection: "inbound" | "outbound" | "bidirectional";
    connectionComplexity: "low" | "medium" | "high";
    recommendedFor: string[];
    version: string;
  };
  connection: {
    id: string;
    status: string;
    last_sync_at: string | null;
    config: Record<string, unknown>;
  } | null;
  connectionStatus: "pending" | "active" | "error" | "disabled" | "not_connected" | "coming_soon";
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

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString();
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isConnectorConnected(entry: ConnectorSummary): boolean {
  return entry.connectionStatus !== "not_connected" && entry.connectionStatus !== "coming_soon";
}

function connectorStatusLabel(entry: ConnectorSummary): string {
  if (entry.connectionStatus === "coming_soon") return "Coming Soon";
  if (!isConnectorConnected(entry)) return "Not Connected";
  if (entry.health.status === "warning" || entry.health.status === "error") return "Needs Attention";
  if (entry.health.status === "healthy") return "Connected";
  return "Connected";
}

function connectorStatusTone(entry: ConnectorSummary): "success" | "warning" | "danger" | "neutral" {
  if (entry.connectionStatus === "coming_soon") return "neutral";
  if (!isConnectorConnected(entry)) return "neutral";
  if (entry.health.status === "error") return "danger";
  if (entry.health.status === "warning") return "warning";
  return "success";
}

function connectorRecommendedAction(entry: ConnectorSummary): string {
  if (entry.connectionStatus === "coming_soon") return "Track roadmap and request early access.";
  if (!isConnectorConnected(entry)) return "Connect this system to expand operational coverage.";
  if (entry.health.status === "error") return "Open details, review sync errors, and retry failed sync.";
  if (entry.health.status === "warning") return "Review delayed syncs and validate source health.";
  return "Connected and healthy. Validate mapping and monitor sync history.";
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
        setConnectors(data.connectors ?? []);
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
        const haystack = `${entry.connector.displayName} ${entry.connector.category} ${entry.connector.connectorType} ${
          entry.connector.authType
        } ${entry.connector.description} ${entry.connector.primaryDataDomains.join(" ")} ${entry.connector.capabilities.join(
          " "
        )}`;
        return haystack.toLowerCase().includes(search.trim().toLowerCase());
      }),
    [connectors, search]
  );

  const counts = useMemo(() => {
    const connected = connectors.filter((entry) => isConnectorConnected(entry)).length;
    const available = connectors.filter((entry) => entry.connector.status === "available").length;
    const comingSoon = connectors.filter((entry) => entry.connector.status === "coming_soon").length;
    const healthy = connectors.filter(
      (entry) => isConnectorConnected(entry) && entry.health.status === "healthy"
    ).length;
    const needsAttention = connectors.filter(
      (entry) => isConnectorConnected(entry) && (entry.health.status === "warning" || entry.health.status === "error")
    ).length;
    const totalRuns = connectors.reduce((sum, entry) => sum + entry.syncStats.totalRuns, 0);
    const successfulRuns = connectors.reduce((sum, entry) => sum + entry.syncStats.successfulRuns, 0);
    const completedRuns = connectors.reduce(
      (sum, entry) =>
        sum + entry.syncStats.successfulRuns + entry.syncStats.failedRuns + entry.syncStats.partialRuns,
      0
    );
    const syncSuccessPct =
      completedRuns > 0 ? Math.round((successfulRuns / completedRuns) * 1000) / 10 : 100;
    return { connected, available, comingSoon, healthy, needsAttention, totalRuns, syncSuccessPct };
  }, [connectors]);

  const categoryGroups = useMemo(() => {
    const byCategory = new Map<ConnectorOperationalCategory, ConnectorSummary[]>();
    for (const category of CONNECTED_SYSTEMS_CATEGORIES) {
      byCategory.set(category.id, []);
    }
    for (const entry of filtered) {
      const categoryEntries = byCategory.get(entry.connector.category);
      if (categoryEntries) categoryEntries.push(entry);
    }
    return byCategory;
  }, [filtered]);

  const coverage = useMemo(() => {
    return CONNECTED_SYSTEMS_CATEGORIES.map((category) => {
      const entries = connectors.filter((entry) => entry.connector.category === category.id);
      const connected = entries.filter((entry) => isConnectorConnected(entry)).length;
      const available = entries.filter((entry) => entry.connector.status === "available").length;
      return {
        key: category.coverageKey,
        connected,
        available,
      };
    });
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
          <SkeletonKpiGrid count={6} />
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
    <PageLayout
      hero={
        <HeroPanel>
          <SectionHeader
            eyebrow="Operational intelligence layer"
            title="Connected Systems"
            description="This is where Cornerstone connects to the operational systems that power your business. Cornerstone remains the decision layer above your existing software ecosystem."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <KpiCard label="Connected" value={counts.connected} hint="Live connected systems" emphasis="operational" />
            <KpiCard label="Available" value={counts.available} hint="Connectors available now" />
            <KpiCard label="Coming Soon" value={counts.comingSoon} hint="Planned roadmap connectors" />
            <KpiCard label="Healthy" value={counts.healthy} hint="Connected and healthy" emphasis="success" />
            <KpiCard
              label="Needs Attention"
              value={counts.needsAttention}
              hint="Connected but degraded"
              emphasis={counts.needsAttention > 0 ? "warning" : "default"}
            />
            <KpiCard
              label="Sync Success"
              value={`${counts.syncSuccessPct}%`}
              hint={`${counts.totalRuns} tracked sync runs`}
              emphasis={counts.syncSuccessPct >= 99 ? "success" : "warning"}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {coverage.map((item) => (
              <StatusChip
                key={item.key}
                label={`${item.key}: ${item.connected}/${Math.max(item.available, 1)}`}
                tone={item.connected > 0 ? "success" : item.available > 0 ? "warning" : "neutral"}
                showDot={false}
              />
            ))}
          </div>
        </HeroPanel>
      }
    >
      <PageSection>
        <SectionHeader
          title="Connected systems registry"
          description="Browse operational categories and connect the systems Cornerstone uses to power decisions."
          action={
            <input
              className="ui-input w-[240px]"
              placeholder="Search systems, capabilities, or domains"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search connected systems"
            />
          }
        />
        {error ? (
          <Panel
            padding="sm"
            className="border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)] bg-[var(--status-danger-subtle)]"
          >
            <p className="cs-text-body text-[var(--status-danger)]">{error}</p>
          </Panel>
        ) : null}
        {message ? (
          <Panel
            padding="sm"
            className="border-[color-mix(in_srgb,var(--status-success)_25%,transparent)] bg-[var(--status-success-subtle)]"
          >
            <p className="cs-text-body text-[var(--status-success)]">{message}</p>
          </Panel>
        ) : null}

        <div className="space-y-6">
          {CONNECTED_SYSTEMS_CATEGORIES.map((category) => {
            const entries = categoryGroups.get(category.id) ?? [];
            const connectedInCategory = entries.filter((entry) => isConnectorConnected(entry)).length;
            const comingSoonInCategory = entries.filter(
              (entry) => entry.connector.status === "coming_soon"
            ).length;
            const availableInCategory = entries.filter(
              (entry) => entry.connector.status === "available"
            ).length;

            return (
              <Panel key={category.id} padding="md" className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="cs-text-section-title">{category.label}</h3>
                    <p className="cs-text-caption cs-text-muted max-w-3xl">{category.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusChip
                      label={`${connectedInCategory} connected`}
                      tone={connectedInCategory > 0 ? "success" : "neutral"}
                      showDot={false}
                    />
                    <StatusChip
                      label={`${availableInCategory} available`}
                      tone="info"
                      showDot={false}
                    />
                    <StatusChip
                      label={`${comingSoonInCategory} coming soon`}
                      tone={comingSoonInCategory > 0 ? "warning" : "neutral"}
                      showDot={false}
                    />
                  </div>
                </div>

                {entries.length === 0 ? (
                  <EmptyState
                    icon={<Plug className="size-5" />}
                    title={`No ${category.label} connectors found`}
                    description={`No connectors matched this category for your current filters. ${category.description}`}
                  />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {entries.map((entry) => {
                      const isConnected = isConnectorConnected(entry);
                      const isBusy = pendingKey === entry.connector.key;
                      const isComingSoon = entry.connectionStatus === "coming_soon";
                      return (
                        <Panel key={entry.connector.key} padding="md" className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="cs-text-section-title">{entry.connector.displayName}</p>
                              <p className="cs-text-caption cs-text-muted">
                                {formatLabel(entry.connector.connectorType)} ·{" "}
                                {formatLabel(entry.connector.providerType)} connector
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <StatusChip
                                label={connectorStatusLabel(entry)}
                                tone={connectorStatusTone(entry)}
                                showDot={false}
                              />
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
                            </div>
                          </div>
                          <p className="cs-text-caption">{entry.connector.description}</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <p className="cs-text-caption cs-text-muted">
                              <ShieldCheck className="mr-1 inline size-3.5" />
                              Auth: {formatLabel(entry.connector.authType)}
                            </p>
                            <p className="cs-text-caption cs-text-muted">
                              <Link2 className="mr-1 inline size-3.5" />
                              Sync: {formatLabel(entry.connector.syncDirection)}
                            </p>
                            <p className="cs-text-caption cs-text-muted">
                              <Clock3 className="mr-1 inline size-3.5" />
                              Last Sync: {formatDate(entry.health.lastSyncAt)}
                            </p>
                            <p className="cs-text-caption cs-text-muted">
                              Version: {entry.connector.version}
                            </p>
                            <p className="cs-text-caption cs-text-muted sm:col-span-2">
                              Primary Operational Data: {entry.connector.primaryDataDomains.join(", ")}
                            </p>
                            <p className="cs-text-caption cs-text-muted sm:col-span-2">
                              Capabilities: {entry.connector.capabilities.join(", ")}
                            </p>
                            <p className="cs-text-caption cs-text-muted sm:col-span-2">
                              Recommended For: {entry.connector.recommendedFor.join(", ")}
                            </p>
                            <p className="cs-text-caption sm:col-span-2">
                              Recommended Action: {connectorRecommendedAction(entry)}
                            </p>
                            <p className="cs-text-caption cs-text-muted sm:col-span-2">
                              Statistics: {entry.syncStats.successfulRuns} successful ·{" "}
                              {entry.syncStats.failedRuns} failed · {entry.syncStats.partialRuns} partial
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {canManage && !isComingSoon ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => mutateConnector(entry.connector.key, "connect")}
                                disabled={isBusy || isConnected}
                              >
                                <Plug className="size-3.5" /> Connect
                              </Button>
                            ) : null}
                            {!isComingSoon ? (
                              <>
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
                              </>
                            ) : (
                              <Button type="button" variant="secondary" size="sm" disabled>
                                <Clock3 className="size-3.5" /> Coming soon
                              </Button>
                            )}
                            {canManage && !isComingSoon ? (
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
                            {canManage && !isComingSoon ? (
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
              </Panel>
            );
          })}
        </div>
      </PageSection>

      <PageSection>
        <SectionHeader
          title="Connected systems inventory"
          description="Category-level inventory for executive and implementation reviews."
        />
        <DataTable>
          <Table className="min-w-[1100px]">
            <TableHead>
              <Th>Connector</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Health</Th>
              <Th>Auth</Th>
              <Th>Sync Direction</Th>
              <Th>Last Sync</Th>
              <Th>Version</Th>
              <Th>Recommended Action</Th>
            </TableHead>
            <TBody>
              {filtered.length === 0 ? (
                <TableEmptyState colSpan={9} message="No connected systems found for this filter." />
              ) : (
                filtered.map((entry) => (
                  <Tr key={`row-${entry.connector.key}`}>
                    <Td>{entry.connector.displayName}</Td>
                    <Td>{CONNECTED_SYSTEMS_CATEGORIES.find((item) => item.id === entry.connector.category)?.label ?? formatLabel(entry.connector.category)}</Td>
                    <Td>
                      <StatusChip
                        label={connectorStatusLabel(entry)}
                        tone={connectorStatusTone(entry)}
                        showDot={false}
                      />
                    </Td>
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
                    <Td className="cs-text-caption">{formatLabel(entry.connector.authType)}</Td>
                    <Td className="cs-text-caption">{formatLabel(entry.connector.syncDirection)}</Td>
                    <Td className="cs-text-caption cs-text-muted">{formatDate(entry.health.lastSyncAt)}</Td>
                    <Td className="cs-text-caption">{entry.connector.version}</Td>
                    <Td className="cs-text-caption">{connectorRecommendedAction(entry)}</Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>
        </DataTable>
      </PageSection>

      <PageSection>
        <Panel padding="md" className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 text-[var(--status-operational)]" />
          <p className="cs-text-caption cs-text-muted">
            Cornerstone is the operational intelligence layer above your system stack. Connected Systems
            centralizes telemetry, dispatch, ERP, workforce, CRM, and custom data sources without replacing
            those systems.
          </p>
        </Panel>
      </PageSection>
    </PageLayout>
  );
}
