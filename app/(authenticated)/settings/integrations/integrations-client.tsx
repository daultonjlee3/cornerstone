"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const PROVIDER_LABELS: Record<string, string> = {
  csv_manual: "CSV / Manual Import",
  samsara: "Samsara",
  webhook_jobs: "Jobs Webhook",
  webhook_telematics: "Telematics Webhook",
};

export function IntegrationsClient() {
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [runs, setRuns] = useState<IntegrationSyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/integrations/connections").then((r) => r.json()),
      fetch("/api/integrations/sync-runs?limit=20").then((r) => r.json()),
    ])
      .then(([connData, runsData]) => {
        if (cancelled) return;
        setConnections((connData.connections ?? []) as IntegrationConnection[]);
        setRuns((runsData.runs ?? []) as IntegrationSyncRun[]);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load integration data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
            <Button asChild className="mt-4">
              <Link href="/onboarding-wizard">Set up fleet import</Link>
            </Button>
          </div>
        ) : (
          <DataTable>
            <Table className="min-w-[600px]">
              <TableHead>
                <Th>Provider</Th>
                <Th>Display name</Th>
                <Th>Status</Th>
                <Th>Last sync</Th>
                <Th>Last error</Th>
              </TableHead>
              <TBody>
                {connections.map((c) => (
                  <Tr key={c.id}>
                    <Td>{PROVIDER_LABELS[c.provider] ?? c.provider}</Td>
                    <Td className="text-[var(--muted)]">{c.display_name ?? "—"}</Td>
                    <Td>
                      <StatusBadge status={c.status} />
                    </Td>
                    <Td className="text-[var(--muted)] text-sm">{formatDate(c.last_sync_at)}</Td>
                    <Td className="text-[var(--muted)] text-sm max-w-[200px] truncate">
                      {c.last_error ?? "—"}
                    </Td>
                  </Tr>
                ))}
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

      <section className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Samsara (Sprint 2)
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Native Samsara telematics sync — vehicle locations, engine hours, and driver assignments —
          is planned for Sprint 2. Use CSV import or webhooks in the meantime.
        </p>
      </section>
    </div>
  );
}
