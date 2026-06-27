import type { FleetOperationsSummary } from "@/src/types/fleet";

type Entry = { data: FleetOperationsSummary; expiresAt: number };

const CACHE_TTL_MS = 45_000;
const cache = new Map<string, Entry>();

function key(tenantId: string, date: string): string {
  return `${tenantId}:${date}`;
}

export function getCachedOperationsSummary(
  tenantId: string,
  date: string
): FleetOperationsSummary | null {
  const entry = cache.get(key(tenantId, date));
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) cache.delete(key(tenantId, date));
    return null;
  }
  return entry.data;
}

export function setCachedOperationsSummary(
  tenantId: string,
  date: string,
  data: FleetOperationsSummary
): void {
  cache.set(key(tenantId, date), { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateOperationsSummaryCache(tenantId?: string): void {
  if (!tenantId) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(`${tenantId}:`)) cache.delete(k);
  }
}
