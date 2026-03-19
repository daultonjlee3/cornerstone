import type { SupabaseClient } from "@supabase/supabase-js";

export type GetStartedProgress = {
  assetsCount: number;
  workOrdersCount: number;
  assignedWorkOrdersCount: number;
  completedWorkOrdersCount: number;
};

/**
 * Returns counts used to derive get-started checklist completion.
 * Uses company_ids for the tenant so counts are tenant-scoped.
 */
export async function getOnboardingProgress(
  supabase: SupabaseClient,
  tenantId: string
): Promise<GetStartedProgress> {
  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);
  const companyIds = (companies ?? []).map((c) => (c as { id: string }).id);
  if (companyIds.length === 0) {
    return {
      assetsCount: 0,
      workOrdersCount: 0,
      assignedWorkOrdersCount: 0,
      completedWorkOrdersCount: 0,
    };
  }

  const [
    { count: assetsCount },
    { count: workOrdersCount },
    { count: assignedCount },
    { count: completedCount },
  ] = await Promise.all([
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .or("assigned_technician_id.not.is.null,assigned_crew_id.not.is.null"),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds)
      .eq("status", "completed"),
  ]);

  return {
    assetsCount: assetsCount ?? 0,
    workOrdersCount: workOrdersCount ?? 0,
    assignedWorkOrdersCount: assignedCount ?? 0,
    completedWorkOrdersCount: completedCount ?? 0,
  };
}

export function progressToChecklist(progress: GetStartedProgress): {
  hasCreatedAsset: boolean;
  hasCreatedWorkOrder: boolean;
  hasAssignedTechnician: boolean;
  hasCompletedWorkOrder: boolean;
} {
  return {
    hasCreatedAsset: progress.assetsCount >= 1,
    hasCreatedWorkOrder: progress.workOrdersCount >= 1,
    hasAssignedTechnician: progress.assignedWorkOrdersCount >= 1,
    hasCompletedWorkOrder: progress.completedWorkOrdersCount >= 1,
  };
}
