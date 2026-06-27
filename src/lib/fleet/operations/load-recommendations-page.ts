import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetRecommendationInstance, FleetRecommendationRationale } from "@/src/types/fleet";
import { FLEET_RECOMMENDATION_ENGINE_VERSION } from "@/src/lib/fleet-recommendation-engine/constants";
import { createOperationsPerfTimer } from "./perf";
import type { FleetPaginatedResult, OperationsListQuery } from "./pagination-types";

type RecommendationRow = {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  recommendation_type: string;
  status: string;
  lifecycle: string;
  score: number;
  rationale: FleetRecommendationInstance["rationale"];
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

function mapRecommendationRow(row: RecommendationRow): FleetRecommendationInstance {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    branch_id: row.branch_id ?? "",
    recommendation_type: row.recommendation_type as FleetRecommendationInstance["recommendation_type"],
    status: row.status as FleetRecommendationInstance["status"],
    lifecycle: row.lifecycle as FleetRecommendationInstance["lifecycle"],
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

/** Primary recommendation for hero — single row, no full list load. */
export async function loadPrimaryPendingRecommendation(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string; branchId?: string | null }
): Promise<FleetRecommendationInstance | null> {
  const date = options?.date ?? todayDateOnly();
  const branchId = options?.branchId ?? null;
  const page = await loadPaginatedPendingRecommendations(supabase, tenantId, {
    date,
    branchId,
    page: 1,
    pageSize: 1,
    skip: 0,
    cursor: null,
    status: "pending",
  });
  const rec = page.items[0] ?? null;
  if (!rec) return null;
  if (rec.rationale.board_date && rec.rationale.board_date !== date) return null;
  return rec;
}

export async function countPendingRecommendationsForDate(
  supabase: SupabaseClient,
  tenantId: string,
  date?: string
): Promise<number> {
  const boardDate = date ?? todayDateOnly();
  const { count, error } = await supabase
    .from("recommendation_instances")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .eq("engine_version", FLEET_RECOMMENDATION_ENGINE_VERSION)
    .gt("expires_at", new Date().toISOString())
    .or(`rationale->>board_date.is.null,rationale->>board_date.eq.${boardDate}`);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function loadPaginatedPendingRecommendations(
  supabase: SupabaseClient,
  tenantId: string,
  query: OperationsListQuery
): Promise<FleetPaginatedResult<FleetRecommendationInstance>> {
  const date = query.date ?? todayDateOnly();
  const perf = createOperationsPerfTimer("operations-recommendations-page");
  const offset = query.skip + (query.page - 1) * query.pageSize;
  const rangeEnd = offset + query.pageSize - 1;

  let dbQuery = supabase
    .from("recommendation_instances")
    .select(
      "id, tenant_id, branch_id, recommendation_type, status, lifecycle, score, rationale, engine_version, created_at, expires_at",
      { count: "exact" }
    )
    .eq("tenant_id", tenantId)
    .eq("status", query.status ?? "pending")
    .eq("engine_version", FLEET_RECOMMENDATION_ENGINE_VERSION)
    .gt("expires_at", new Date().toISOString())
    .or(`rationale->>board_date.is.null,rationale->>board_date.eq.${date}`)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, rangeEnd);

  if (query.branchId) dbQuery = dbQuery.eq("branch_id", query.branchId);

  const { data, error, count } = await dbQuery;
  if (error) throw new Error(error.message);

  const items = (data ?? []).map((row) => mapRecommendationRow(row as RecommendationRow));
  const fullCount = count ?? items.length;
  const totalCount = Math.max(0, fullCount - query.skip);
  const hasMore = offset + items.length < fullCount;
  const last = items[items.length - 1];

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
