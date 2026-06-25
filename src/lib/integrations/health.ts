import type { IntegrationConnection } from "@/src/types/fleet";

export type ConnectorHealthStatus = "healthy" | "warning" | "error" | "not_connected";

export type ConnectorHealthSummary = {
  status: ConnectorHealthStatus;
  label: string;
  lastSyncAt: string | null;
  staleMinutes: number | null;
  reason: string | null;
};

export function computeConnectorHealth(
  connection: Pick<IntegrationConnection, "status" | "last_sync_at" | "last_error" | "config"> | null
): ConnectorHealthSummary {
  if (!connection) {
    return {
      status: "not_connected",
      label: "Not connected",
      lastSyncAt: null,
      staleMinutes: null,
      reason: null,
    };
  }

  if (connection.status === "error") {
    return {
      status: "error",
      label: "Needs attention",
      lastSyncAt: connection.last_sync_at,
      staleMinutes: getStaleMinutes(connection.last_sync_at),
      reason: connection.last_error ?? "Connection error",
    };
  }

  if (connection.status === "pending" || connection.status === "disabled") {
    return {
      status: "warning",
      label: connection.status === "pending" ? "Pending setup" : "Disabled",
      lastSyncAt: connection.last_sync_at,
      staleMinutes: getStaleMinutes(connection.last_sync_at),
      reason: connection.last_error ?? null,
    };
  }

  const staleThresholdMinutes = getStaleThresholdMinutes(connection.config);
  const staleMinutes = getStaleMinutes(connection.last_sync_at);
  if (staleMinutes != null && staleMinutes > staleThresholdMinutes) {
    return {
      status: "warning",
      label: "Sync delayed",
      lastSyncAt: connection.last_sync_at,
      staleMinutes,
      reason: connection.last_error ?? `Last sync is older than ${staleThresholdMinutes} minutes`,
    };
  }

  return {
    status: "healthy",
    label: "Healthy",
    lastSyncAt: connection.last_sync_at,
    staleMinutes,
    reason: connection.last_error ?? null,
  };
}

function getStaleThresholdMinutes(config: Record<string, unknown>): number {
  const intervalSeconds = typeof config.poll_interval_sec === "number" ? config.poll_interval_sec : 300;
  return Math.max(5, Math.round((intervalSeconds * 3) / 60));
}

function getStaleMinutes(lastSyncAt: string | null): number | null {
  if (!lastSyncAt) return null;
  const parsed = Date.parse(lastSyncAt);
  if (!Number.isFinite(parsed)) return null;
  return Math.round((Date.now() - parsed) / 60000);
}
