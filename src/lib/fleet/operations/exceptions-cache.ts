import type { FleetOperationalException } from "@/src/types/fleet";

type Entry = { exceptions: FleetOperationalException[]; expiresAt: number };

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, Entry>();

function key(tenantId: string, date: string): string {
  return `${tenantId}:${date}`;
}

export function getCachedDispatchExceptions(
  tenantId: string,
  date: string
): FleetOperationalException[] | null {
  const entry = cache.get(key(tenantId, date));
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) cache.delete(key(tenantId, date));
    return null;
  }
  return entry.exceptions;
}

export function setCachedDispatchExceptions(
  tenantId: string,
  date: string,
  exceptions: FleetOperationalException[]
): void {
  cache.set(key(tenantId, date), {
    exceptions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateDispatchExceptionsCache(tenantId?: string): void {
  if (!tenantId) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(`${tenantId}:`)) cache.delete(k);
  }
}
