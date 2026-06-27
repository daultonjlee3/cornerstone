import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FleetRecommendationInstance,
  FleetRecommendationRationale,
  RecommendationLifecyclePhase,
} from "@/src/types/fleet";
import { FLEET_RECOMMENDATION_ENGINE_VERSION } from "@/src/lib/fleet-recommendation-engine/constants";
import { createOperationsPerfTimer } from "./perf";
import type { FleetPaginatedResult, OperationsListQuery } from "./pagination-types";

/** Columns that exist on all deployed schemas (lifecycle may be missing locally). */
export const RECOMMENDATION_INSTANCE_SELECT =
  "id, tenant_id, branch_id, recommendation_type, status, score, rationale, engine_version, created_at, expires_at";

type RecommendationRow = {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  recommendation_type: string;
  status: string;
  score: number;
  rationale: unknown;
  engine_version: string;
  created_at: string;
  expires_at: string;
};

function normalizeRationale(raw: unknown): FleetRecommendationRationale {
  if (raw && typeof raw === "object") {
    return raw as FleetRecommendationRationale;
  }
  return {
    title: "Recommendation",
    reasons: [],
    factors: {
      travelImpact: 0,
      utilizationImpact: 0,
      capacityImpact: 0,
      telematicsFreshness: 0,
    },
    entities: {},
  };
}

function lifecycleFromStatus(status: string): RecommendationLifecyclePhase {
  switch (status) {
    case "accepted":
      return "accepted";
    case "dismissed":
      return "rejected";
    case "expired":
      return "expired";
    case "failed":
      return "failed";
    default:
      return "ready";
  }
}

export function mapRecommendationInstanceRow(row: RecommendationRow): FleetRecommendationInstance {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    branch_id: row.branch_id ?? "",
    recommendation_type: row.recommendation_type as FleetRecommendationInstance["recommendation_type"],
    status: row.status as FleetRecommendationInstance["status"],
    lifecycle: lifecycleFromStatus(row.status),
    score: Number(row.score),
    rationale: normalizeRationale(row.rationale),
    engine_version: row.engine_version,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

type CountCacheEntry = { count: number; expiresAt: number };
const pendingCountCache = new Map<string, CountCacheEntry>();

async function getCachedPendingCount(
  supabase: SupabaseClient,
  tenantId: string,
  date: string
): Promise<number> {
  const key = `${tenantId}:${date}`;
  const hit = pendingCountCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.count;
  const count = await countPendingRecommendationsFast(supabase, tenantId, { date });
  pendingCountCache.set(key, { count, expiresAt: Date.now() + 30_000 });
  return count;
}

function matchesBoardDate(rec: FleetRecommendationInstance, date: string): boolean {
  return !rec.rationale.board_date || rec.rationale.board_date === date;
}

function pendingBaseQuery(supabase: SupabaseClient, tenantId: string) {
  return supabase
    .from("recommendation_instances")
    .select(RECOMMENDATION_INSTANCE_SELECT)
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .eq("engine_version", FLEET_RECOMMENDATION_ENGINE_VERSION)
    .gt("expires_at", new Date().toISOString())
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });
}

/**
 * Bounded count — avoids exact COUNT(*) timeouts on large pending sets.
 * Caps at 5000 for display ("5000+").
 */
export async function countPendingRecommendationsFast(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string }
): Promise<number> {
  const date = options?.date;
  const selectCols = date ? "id, rationale" : "id";

  const { data, error } = await supabase
    .from("recommendation_instances")
    .select(selectCols)
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .eq("engine_version", FLEET_RECOMMENDATION_ENGINE_VERSION)
    .gt("expires_at", new Date().toISOString())
    .limit(5001);

  if (error) {
    console.warn("[operations] pending recommendation count failed:", error.message);
    return 0;
  }

  const rows = data ?? [];
  if (!date) return rows.length;

  return rows.filter((row) => {
    const rationale = (row as { rationale?: { board_date?: string } }).rationale;
    const boardDate = rationale?.board_date;
    return !boardDate || boardDate === date;
  }).length;
}

/** Primary recommendation for hero — small indexed fetch, no exact count. */
export async function loadPrimaryPendingRecommendation(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string; branchId?: string | null }
): Promise<FleetRecommendationInstance | null> {
  const date = options?.date ?? todayDateOnly();
  let query = pendingBaseQuery(supabase, tenantId).limit(32);
  if (options?.branchId) query = query.eq("branch_id", options.branchId);

  const { data, error } = await query;
  if (error) {
    console.warn("[operations] primary recommendation load failed:", error.message);
    return null;
  }

  const items = (data ?? []).map((row) => mapRecommendationInstanceRow(row as RecommendationRow));
  return items.find((rec) => matchesBoardDate(rec, date)) ?? null;
}

export async function countPendingRecommendationsForDate(
  supabase: SupabaseClient,
  tenantId: string,
  date?: string
): Promise<number> {
  return countPendingRecommendationsFast(supabase, tenantId, { date });
}

export async function loadPaginatedPendingRecommendations(
  supabase: SupabaseClient,
  tenantId: string,
  query: OperationsListQuery
): Promise<FleetPaginatedResult<FleetRecommendationInstance>> {
  const date = query.date ?? todayDateOnly();
  const perf = createOperationsPerfTimer("operations-recommendations-page");
  const offset = query.skip + (query.page - 1) * query.pageSize;
  const fetchSize = query.pageSize + 1;
  const windowEnd = offset + Math.max(fetchSize * 4, 40) - 1;

  let dbQuery = pendingBaseQuery(supabase, tenantId).range(offset, windowEnd);
  if (query.branchId) dbQuery = dbQuery.eq("branch_id", query.branchId);

  const { data, error } = await dbQuery;
  if (error) throw new Error(error.message);

  const mapped = (data ?? []).map((row) => mapRecommendationInstanceRow(row as RecommendationRow));
  const filtered = mapped.filter((rec) => matchesBoardDate(rec, date));
  const items = filtered.slice(0, query.pageSize);
  const hasMore = filtered.length > query.pageSize || mapped.length >= windowEnd - offset + 1;
  const last = items[items.length - 1];

  const fullCount = await getCachedPendingCount(supabase, tenantId, date);
  const totalCount = Math.max(0, fullCount - query.skip);

  perf.finish({ page: query.page, pageSize: query.pageSize, returned: items.length, totalCount });

  return {
    items,
    totalCount,
    hasMore,
    nextCursor: hasMore && last ? last.id : null,
    page: query.page,
    pageSize: query.pageSize,
  };
}
