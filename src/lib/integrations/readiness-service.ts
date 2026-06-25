import type { SupabaseClient } from "@supabase/supabase-js";

export type ReadinessCheck = {
  code: string;
  label: string;
  status: "ready" | "warning" | "blocked";
  detail: string;
  estimated: boolean;
};

export type ReadinessSnapshot = {
  implementationProgressPct: number;
  readinessScorePct: number;
  checks: ReadinessCheck[];
  counts: {
    connectorsActive: number;
    importsCompleted: number;
    jobs: number;
    trucksWithTelematics: number;
    recommendationsPending: number;
  };
};

export async function loadReadinessSnapshot(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ReadinessSnapshot> {
  const [connections, importBatches, jobs, trucks, recommendations, martFreshness] = await Promise.all([
    fetchActiveConnectionsCount(supabase, tenantId),
    fetchCompletedImportsCount(supabase, tenantId),
    fetchJobsCount(supabase, tenantId),
    fetchTrucksWithTelemetryCount(supabase, tenantId),
    fetchPendingRecommendationsCount(supabase, tenantId),
    fetchMartFreshness(supabase, tenantId),
  ]);

  const checks: ReadinessCheck[] = [
    {
      code: "connector_readiness",
      label: "Connector readiness",
      status: connections >= 1 ? "ready" : "blocked",
      detail: connections >= 1 ? `${connections} active connector(s)` : "No active connectors",
      estimated: false,
    },
    {
      code: "import_readiness",
      label: "Import readiness",
      status: importBatches >= 1 ? "ready" : "warning",
      detail: importBatches >= 1 ? `${importBatches} completed import batch(es)` : "No completed import batches",
      estimated: false,
    },
    {
      code: "dispatch_readiness",
      label: "Dispatch readiness",
      status: jobs >= 10 && trucks >= 5 ? "ready" : jobs > 0 && trucks > 0 ? "warning" : "blocked",
      detail: `${jobs} jobs, ${trucks} trucks with telematics`,
      estimated: true,
    },
    {
      code: "recommendation_readiness",
      label: "Recommendation readiness",
      status: recommendations > 0 ? "ready" : "warning",
      detail:
        recommendations > 0
          ? `${recommendations} pending recommendation(s)`
          : "No pending recommendations yet",
      estimated: true,
    },
    {
      code: "historical_data_readiness",
      label: "Historical baseline readiness",
      status: martFreshness.isFresh ? "ready" : martFreshness.hasData ? "warning" : "blocked",
      detail: martFreshness.detail,
      estimated: true,
    },
  ];

  const readyCount = checks.filter((check) => check.status === "ready").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const readinessScorePct = Math.round(
    ((readyCount + warningCount * 0.5) / Math.max(1, checks.length)) * 100
  );

  const implementationSignals = [
    connections > 0 ? 1 : 0,
    importBatches > 0 ? 1 : 0,
    jobs > 0 ? 1 : 0,
    trucks > 0 ? 1 : 0,
    recommendations > 0 ? 1 : 0,
  ];
  const implementationProgressPct = Math.round(
    (implementationSignals.reduce((total, value) => total + value, 0) / implementationSignals.length) *
      100
  );

  return {
    implementationProgressPct,
    readinessScorePct,
    checks,
    counts: {
      connectorsActive: connections,
      importsCompleted: importBatches,
      jobs,
      trucksWithTelematics: trucks,
      recommendationsPending: recommendations,
    },
  };
}

async function fetchActiveConnectionsCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("integration_connections")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchCompletedImportsCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("integration_import_batches")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("status", ["completed", "partial"]);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchJobsCount(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchTrucksWithTelemetryCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("trucks")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .not("last_telematics_at", "is", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchPendingRecommendationsCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("recommendation_instances")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchMartFreshness(
  supabase: SupabaseClient,
  tenantId: string
): Promise<{ isFresh: boolean; hasData: boolean; detail: string }> {
  const { data, error } = await supabase
    .from("utilization_daily")
    .select("refreshed_at")
    .eq("tenant_id", tenantId)
    .order("refreshed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.refreshed_at) {
    return {
      isFresh: false,
      hasData: false,
      detail: "No historical baseline rows found",
    };
  }
  const ageHours = Math.round((Date.now() - Date.parse(String(data.refreshed_at))) / 3600000);
  const isFresh = ageHours <= 24;
  return {
    isFresh,
    hasData: true,
    detail: isFresh ? `Mart refreshed ${ageHours}h ago` : `Mart stale (${ageHours}h old)`,
  };
}
