import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, AdminClientConfigError } from "@/src/lib/supabase/admin";
import { resetPeachtreeFleetDemo } from "@/scripts/seed-fleet-demo/reset";
import { seedPeachtreeFleetDemo } from "@/scripts/seed-fleet-demo/seed";
import { validatePeachtreeFleetDemo } from "@/scripts/seed-fleet-demo/validate";
import {
  DEMO_DAY_UNASSIGNED_TARGET,
  PEACHTREE_TENANT,
  TOTAL_TRUCKS,
} from "@/scripts/seed-fleet-demo/constants";

export { PEACHTREE_TENANT, DEMO_DAY_UNASSIGNED_TARGET, TOTAL_TRUCKS };

export type PeachtreeDemoRefreshResult = {
  demoBoardDate: string;
  truckCount: number;
  jobCount: number;
  unassignedOnDemoDay: number;
  recommendationCount: number;
  validationPassed: boolean;
  failedChecks: string[];
};

export async function refreshPeachtreeDemoTenant(
  supabase?: SupabaseClient
): Promise<PeachtreeDemoRefreshResult> {
  const client = supabase ?? createAdminClient();

  await resetPeachtreeFleetDemo(client);
  const seedResult = await seedPeachtreeFleetDemo(client);
  const { checks, allPass } = await validatePeachtreeFleetDemo(client, seedResult.tenantId);

  const boardDate = seedResult.demoBoardDate;
  const dayStart = `${boardDate}T00:00:00.000Z`;
  const dayEnd = `${boardDate}T23:59:59.999Z`;
  const { count: unassignedOnDemoDay } = await client
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", seedResult.tenantId)
    .eq("status", "unassigned")
    .gte("scheduled_start", dayStart)
    .lte("scheduled_start", dayEnd);

  return {
    demoBoardDate: boardDate,
    truckCount: seedResult.truckCount,
    jobCount: seedResult.jobCount,
    unassignedOnDemoDay: unassignedOnDemoDay ?? 0,
    recommendationCount: seedResult.recommendationCount,
    validationPassed: allPass,
    failedChecks: checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail}`),
  };
}

export function isPeachtreeDemoRefreshConfigured(): boolean {
  try {
    createAdminClient();
    return true;
  } catch (error) {
    return error instanceof AdminClientConfigError ? false : false;
  }
}
