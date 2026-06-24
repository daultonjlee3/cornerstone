"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/ui/status-badge";
import {
  DataTable,
  Table,
  TableHead,
  Th,
  TBody,
  Tr,
  Td,
} from "@/src/components/ui/data-table";
import type { IntegrationConnection, IntegrationSyncRun } from "@/src/types/fleet";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function connectionHealth(c: IntegrationConnection): "healthy" | "warning" | "error" {
  if (c.status === "error") return "error";
  if (!c.last_sync_at) return c.status === "active" ? "warning" : "warning";
  const ageMs = Date.now() - Date.parse(c.last_sync_at);
  if (Number.isNaN(ageMs)) return "warning";
  const pollSec =
    typeof c.config?.poll_interval_sec === "number" ? c.config.poll_interval_sec : 300;
  if (ageMs > pollSec * 3 * 1000) return "warning";
  return "healthy";
}

const HEALTH_LABELS = {
  healthy: "Healthy",
  warning: "Stale",
  error: "Error",
};

const PROVIDER_LABELS: Record<string, string> = {
  csv_manual: "CSV / Manual Import",
  samsara: "Samsara",
  webhook_jobs: "Jobs Webhook",
  webhook_telematics: "Telematics Webhook",
};

type WebhookSetupResult = {
  webhook_url: string;
  webhook_secret: string;
  connection: IntegrationConnection;
};

export function IntegrationsClient() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [runs, setRuns] = useState<IntegrationSyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [webhookReveal, setWebhookReveal] = useState<WebhookSetupResult | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [connData, runsData] = await Promise.all([
        fetch("/api/integrations/connections").then((r) => r.json()),
        fetch("/api/integrations/sync-runs?limit=20").then((r) => r.json()),
      ]);
      setConnections((connData.connections ?? []) as IntegrationConnection[]);
      setRuns((runsData.runs ?? []) as IntegrationSyncRun[]);
    } catch {
      setError("Failed to load integration data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const samsara = searchParams.get("samsara");
    if (samsara === "connected") setMessage("Samsara connected successfully.");
    if (samsara === "error") setMessage("Samsara connection failed. Check credentials and try again.");
  }, [searchParams]);

  const samsaraConnection = connections.find((c) => c.provider === "samsara");
  const jobsWebhook = connections.find((c) => c.provider === "webhook_jobs");
  const telematicsWebhook = connections.find((c) => c.provider === "webhook_telematics");

  const createWebhook = async (provider: "webhook_jobs" | "webhook_telematics") => {
    setMessage(null);
    const res = await fetch("/api/integrations/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_webhook", provider }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create webhook.");
      return;
    }
    setWebhookReveal(data as WebhookSetupResult);
    await load();
  };

  const syncSamsara = async () => {
    if (!samsaraConnection) return;
    setSyncingId(samsaraConnection.id);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/samsara/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: samsaraConnection.id }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Sync failed.");
      else setMessage("Samsara sync completed.");
      await load();
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading integrations…</p>;
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg bg-[var(--accent)]/10 px-4 py-2 text-sm text-[var(--accent)]" role="status">
          {message}
        </div>
      )}

      {webhookReveal && (
        <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--card)] p-4 space-y-2">
          <p className="text-sm font-medium text-[var(--foreground)]">
            Webhook created — copy these values now (secret shown once):
          </p>
          <p className="text-xs text-[var(--muted)] break-all">
            <span className="font-semibold">URL:</span> {webhookReveal.webhook_url}
          </p>
          <p className="text-xs text-[var(--muted)] break-all">
            <span className="font-semibold">Secret header (X-Webhook-Secret):</span>{" "}
            {webhookReveal.webhook_secret}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setWebhookReveal(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 space-y-3">
          <h3 className="font-medium text-[var(--foreground)]">Samsara</h3>
          <p className="text-sm text-[var(--muted)]">
            OAuth connect for vehicle list and GPS polling (≤5 min lag).
          </p>
          {samsaraConnection ? (
            <>
              <StatusBadge status={samsaraConnection.status} />
              <p className="text-xs text-[var(--muted)]">
                Last sync: {formatDate(samsaraConnection.last_sync_at)}
              </p>
              {samsaraConnection.status === "active" ? (
                <Button type="button" size="sm" disabled={syncingId != null} onClick={syncSamsara}>
                  {syncingId ? "Syncing…" : "Sync now"}
                </Button>
              ) : (
                <Button asChild size="sm">
                  <a href="/api/integrations/samsara/authorize">Connect Samsara</a>
                </Button>
              )}
            </>
          ) : (
            <Button asChild size="sm">
              <a href="/api/integrations/samsara/authorize">Connect Samsara</a>
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 space-y-3">
          <h3 className="font-medium text-[var(--foreground)]">Jobs webhook</h3>
          <p className="text-sm text-[var(--muted)]">Inbound fleet job upserts with revenue + site.</p>
          {jobsWebhook ? (
            <p className="text-xs text-[var(--muted)]">Active — use Integrations table for health.</p>
          ) : null}
          <Button type="button" size="sm" onClick={() => createWebhook("webhook_jobs")}>
            {jobsWebhook ? "Rotate webhook secret" : "Enable jobs webhook"}
          </Button>
        </div>

        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 space-y-3">
          <h3 className="font-medium text-[var(--foreground)]">Telematics webhook</h3>
          <p className="text-sm text-[var(--muted)]">Generic GPS event ingest for non-Samsara sources.</p>
          {telematicsWebhook ? (
            <p className="text-xs text-[var(--muted)]">Active — use Integrations table for health.</p>
          ) : null}
          <Button type="button" size="sm" onClick={() => createWebhook("webhook_telematics")}>
            {telematicsWebhook ? "Rotate webhook secret" : "Enable telematics webhook"}
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-[var(--foreground)]">Connections</h2>
            <p className="text-sm text-[var(--muted)]">
              Active data sources and import channels for your fleet.
            </p>
          </div>
          <Button asChild>
            <Link href="/onboarding-wizard">Import data</Link>
          </Button>
        </div>

        {connections.length === 0 ? (
          <div className="ui-card py-10 text-center">
            <p className="text-[var(--muted)]">No integration connections yet.</p>
          </div>
        ) : (
          <DataTable>
            <Table className="min-w-[700px]">
              <TableHead>
                <Th>Provider</Th>
                <Th>Health</Th>
                <Th>Status</Th>
                <Th>Last sync</Th>
                <Th>Last error</Th>
              </TableHead>
              <TBody>
                {connections.map((c) => {
                  const health = connectionHealth(c);
                  return (
                    <Tr key={c.id}>
                      <Td>{PROVIDER_LABELS[c.provider] ?? c.provider}</Td>
                      <Td>
                        <span
                          className={
                            health === "healthy"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : health === "warning"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                          }
                        >
                          {HEALTH_LABELS[health]}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge status={c.status} />
                      </Td>
                      <Td className="text-[var(--muted)] text-sm">{formatDate(c.last_sync_at)}</Td>
                      <Td className="text-[var(--muted)] text-sm max-w-[200px] truncate">
                        {c.last_error ?? "—"}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </DataTable>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-[var(--foreground)]">Recent sync runs</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No sync runs recorded yet.</p>
        ) : (
          <DataTable>
            <Table className="min-w-[600px]">
              <TableHead>
                <Th>Started</Th>
                <Th>Finished</Th>
                <Th>Status</Th>
                <Th>Processed</Th>
                <Th>Failed</Th>
              </TableHead>
              <TBody>
                {runs.map((r) => (
                  <Tr key={r.id}>
                    <Td className="text-sm text-[var(--muted)]">{formatDate(r.started_at)}</Td>
                    <Td className="text-sm text-[var(--muted)]">{formatDate(r.finished_at)}</Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                    <Td className="text-[var(--muted)]">{r.records_processed}</Td>
                    <Td className="text-[var(--muted)]">{r.records_failed}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </DataTable>
        )}
      </section>

      <section className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Webhook documentation
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Send authenticated POST requests with header{" "}
          <code className="text-xs">X-Webhook-Secret</code> and query{" "}
          <code className="text-xs">?connection=&lt;connection_id&gt;</code>.
        </p>
        <div className="text-xs text-[var(--muted)] space-y-2 font-mono bg-[var(--background)] p-3 rounded-lg overflow-x-auto">
          <p>POST /api/integrations/webhooks/jobs?connection=...</p>
          <p>{`{ "external_id", "branch_code", "title", "revenue_estimate", "required_truck_type", "scheduled_start", "scheduled_end", "site_name", "site_address" }`}</p>
          <p className="pt-2">POST /api/integrations/webhooks/telematics?connection=...</p>
          <p>{`{ "events": [{ "external_truck_id", "recorded_at", "latitude", "longitude" }] }`}</p>
        </div>
      </section>
    </div>
  );
}
