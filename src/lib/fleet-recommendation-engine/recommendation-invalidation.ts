import type { SupabaseClient } from "@supabase/supabase-js";
import { publishDispatchSignal } from "@/src/lib/fleet/dispatch-signals";

export type OperationalInvalidationScope = {
  tenantId: string;
  truckIds?: string[];
  jobIds?: string[];
  branchId?: string | null;
  boardDate?: string;
  reason: string;
  signalType?: "recommendations_invalidated" | "telematics_updated" | "jobs_updated";
  invalidateAllPending?: boolean;
};

function recommendationMatchesScope(
  rationale: Record<string, unknown>,
  scope: OperationalInvalidationScope
): boolean {
  if (scope.invalidateAllPending) return true;
  const entities = (rationale.entities ?? {}) as Record<string, unknown>;
  const jobId = typeof entities.job_id === "string" ? entities.job_id : null;
  const truckId = typeof entities.truck_id === "string" ? entities.truck_id : null;
  const boardDate =
    typeof rationale.board_date === "string" ? rationale.board_date : null;

  if (scope.boardDate && boardDate && boardDate !== scope.boardDate) {
    return false;
  }

  if (scope.jobIds?.length && jobId && scope.jobIds.includes(jobId)) {
    return true;
  }

  if (scope.truckIds?.length && truckId && scope.truckIds.includes(truckId)) {
    return true;
  }

  if (!scope.jobIds?.length && !scope.truckIds?.length) {
    return true;
  }

  const candidates = Array.isArray(rationale.candidates) ? rationale.candidates : [];
  if (
    scope.truckIds?.length &&
    candidates.some(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        scope.truckIds?.includes(String((candidate as { truck_id?: string }).truck_id))
    )
  ) {
    return true;
  }

  return false;
}

export async function invalidatePendingRecommendationsForOperationalChange(
  supabase: SupabaseClient,
  scope: OperationalInvalidationScope
): Promise<{ invalidatedCount: number; invalidatedIds: string[] }> {
  let query = supabase
    .from("recommendation_instances")
    .select("id, rationale, branch_id")
    .eq("tenant_id", scope.tenantId)
    .eq("status", "pending");

  if (scope.branchId) {
    query = query.eq("branch_id", scope.branchId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const matches = (data ?? []).filter((row) =>
    recommendationMatchesScope((row as { rationale: Record<string, unknown> }).rationale, scope)
  );

  if (matches.length === 0) {
    return { invalidatedCount: 0, invalidatedIds: [] };
  }

  const ids = matches.map((row) => (row as { id: string }).id);

  await supabase
    .from("recommendation_instances")
    .update({ status: "failed", lifecycle: "failed" })
    .in("id", ids)
    .eq("tenant_id", scope.tenantId);

  await supabase.from("recommendation_outcomes").insert(
    ids.map((recommendationId) => ({
      recommendation_id: recommendationId,
      action: "failed" as const,
      acted_by: null,
      notes: "Invalidated by operational webhook.",
      application_error: scope.reason,
      estimated_impact: { failure_code: "operational_change", phase: "webhook" },
      measured_impact: {},
    }))
  );

  await publishDispatchSignal(supabase, scope.tenantId, scope.signalType ?? "recommendations_invalidated", {
    reason: scope.reason,
    invalidated_ids: ids,
    truck_ids: scope.truckIds ?? [],
    job_ids: scope.jobIds ?? [],
    board_date: scope.boardDate ?? null,
  });

  return { invalidatedCount: ids.length, invalidatedIds: ids };
}
