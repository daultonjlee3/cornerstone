import type { SupabaseClient } from "@supabase/supabase-js";
import {
  measureRecommendationOutcome,
  type RecommendationMeasuredImpact,
} from "@/src/lib/fleet-recommendation-engine/outcome-tracking";
import type { FleetDispatchJob } from "@/src/types/fleet";

type RefreshRow = {
  instance_id: string;
  instance_status: string;
  job_id: string | null;
  truck_id: string | null;
  outcome_id: string;
  measured_impact: Record<string, unknown> | null;
  travel_minutes: number | null;
  contribution: number | null;
  deadhead_miles: number | null;
  scheduled_start: string | null;
};

function mapJobRow(row: Record<string, unknown>): FleetDispatchJob {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "Job",
    status: row.status as FleetDispatchJob["status"],
    priority: row.priority as FleetDispatchJob["priority"],
    branch_id: row.branch_id as string,
    branch_name: null,
    assigned_truck_id: (row.assigned_truck_id as string | null) ?? null,
    required_truck_type: (row.required_truck_type as string) ?? "any",
    scheduled_start: (row.scheduled_start as string | null) ?? null,
    scheduled_end: (row.scheduled_end as string | null) ?? null,
    revenue_estimate: Number(row.revenue_estimate ?? 0),
    site_name: null,
    site_latitude: null,
    site_longitude: null,
    estimated_deadhead_miles: (row.estimated_deadhead_miles as number | null) ?? null,
    estimated_travel_minutes: (row.estimated_travel_minutes as number | null) ?? null,
  };
}

function isImpactFullyMeasured(impact: RecommendationMeasuredImpact | null): boolean {
  if (!impact) return false;
  const pendingFields = [
    impact.actual_contribution,
    impact.completed_on_time,
    impact.actual_job_duration_hours,
  ];
  return pendingFields.every((field) => field.status !== "pending");
}

/** Refresh measured_impact on applied recommendations when underlying jobs progress or complete. */
export async function refreshRecommendationMeasuredOutcomes(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { branchId?: string | null; limit?: number }
): Promise<{ refreshed: number; completed: number }> {
  const limit = options?.limit ?? 50;

  let query = supabase
    .from("recommendation_instances")
    .select(
      "id, status, rationale, recommendation_outcomes(id, measured_impact, action, acted_at)"
    )
    .eq("tenant_id", tenantId)
    .in("status", ["applied", "accepted"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.branchId) {
    query = query.eq("branch_id", options.branchId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows: RefreshRow[] = [];
  for (const raw of data ?? []) {
    const inst = raw as Record<string, unknown>;
    const rationale = (inst.rationale as Record<string, unknown> | undefined) ?? {};
    const entities = (rationale.entities as Record<string, unknown> | undefined) ?? {};
    const snapshots = (rationale.candidate_snapshots as Array<Record<string, unknown>> | undefined) ?? [];
    const primary = snapshots[0];
    const outcomes = (inst.recommendation_outcomes as Array<Record<string, unknown>> | undefined) ?? [];
    const sortedOutcomes = [...outcomes].sort(
      (a, b) => Date.parse(String(b.acted_at)) - Date.parse(String(a.acted_at))
    );
    const latest = sortedOutcomes.find((o) => o.action === "accepted" || o.action === "applied");
    if (!latest?.id) continue;

    rows.push({
      instance_id: inst.id as string,
      instance_status: inst.status as string,
      job_id: (entities.job_id as string | undefined) ?? null,
      truck_id: (entities.truck_id as string | undefined) ?? null,
      outcome_id: latest.id as string,
      measured_impact: (latest.measured_impact as Record<string, unknown> | null) ?? null,
      travel_minutes: (primary?.travel_minutes as number | null) ?? null,
      contribution: (primary?.estimated_contribution as number | null) ?? null,
      deadhead_miles: (primary?.deadhead_miles as number | null) ?? null,
      scheduled_start: null,
    });
  }

  if (rows.length === 0) return { refreshed: 0, completed: 0 };

  const jobIds = [...new Set(rows.map((r) => r.job_id).filter((id): id is string => Boolean(id)))];
  const jobById = new Map<string, FleetDispatchJob>();

  if (jobIds.length > 0) {
    const { data: jobs, error: jobsError } = await supabase
      .from("fleet_jobs")
      .select(
        "id, title, status, priority, branch_id, assigned_truck_id, required_truck_type, scheduled_start, scheduled_end, revenue_estimate, estimated_deadhead_miles, estimated_travel_minutes"
      )
      .eq("tenant_id", tenantId)
      .in("id", jobIds);

    if (jobsError) throw new Error(jobsError.message);

    for (const jobRow of jobs ?? []) {
      const mapped = mapJobRow(jobRow as Record<string, unknown>);
      jobById.set(mapped.id, mapped);
    }
  }

  let refreshed = 0;
  let completed = 0;

  for (const row of rows) {
    const job = row.job_id ? jobById.get(row.job_id) : undefined;
    if (!job) continue;

    const existing = row.measured_impact as RecommendationMeasuredImpact | null;
    if (isImpactFullyMeasured(existing) && job.status !== "completed") {
      continue;
    }

    const measured = measureRecommendationOutcome({
      job,
      recommendedTruckId: row.truck_id,
      estimatedTravelMinutes: row.travel_minutes,
      estimatedContribution: row.contribution,
      estimatedDeadheadMiles: row.deadhead_miles,
      scheduledStart: job.scheduled_start,
    });

    const { error: updateError } = await supabase
      .from("recommendation_outcomes")
      .update({ measured_impact: measured })
      .eq("id", row.outcome_id);

    if (updateError) continue;
    refreshed += 1;

    if (job.status === "completed" && row.instance_status !== "completed") {
      const { error: statusError } = await supabase
        .from("recommendation_instances")
        .update({ status: "completed" })
        .eq("id", row.instance_id)
        .eq("tenant_id", tenantId);

      if (!statusError) completed += 1;
    }
  }

  return { refreshed, completed };
}
