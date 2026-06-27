import type { FleetDispatchBoardData } from "@/src/types/fleet";

const CACHE_TTL_MS = 45_000;
const cache = new Map<string, { data: FleetDispatchBoardData; expiresAt: number }>();

function key(tenantId: string, date: string, branchId: string | null): string {
  return `${tenantId}:${date}:${branchId ?? ""}`;
}

export function getCachedDispatchBoard(
  tenantId: string,
  date: string,
  branchId: string | null
): FleetDispatchBoardData | null {
  const entry = cache.get(key(tenantId, date, branchId));
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) cache.delete(key(tenantId, date, branchId));
    return null;
  }
  return entry.data;
}

export function setCachedDispatchBoard(
  tenantId: string,
  date: string,
  branchId: string | null,
  data: FleetDispatchBoardData
): void {
  cache.set(key(tenantId, date, branchId), {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateDispatchBoardCache(tenantId?: string): void {
  if (!tenantId) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(`${tenantId}:`)) cache.delete(k);
  }
}
