import type { SupabaseClient } from "@supabase/supabase-js";
import { listIntegrationConnections } from "@/src/lib/integrations/connections";
import { computeConnectorHealth } from "@/src/lib/integrations/health";

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
  healthIndicators: ReadinessHealthIndicator[];
  issues: ReadinessIssue[];
  counts: {
    connectorsActive: number;
    importsCompleted: number;
    jobs: number;
    branches: number;
    operators: number;
    customers: number;
    sites: number;
    trucksTotal: number;
    trucksWithTelematics: number;
    recommendationsPending: number;
  };
};

export type ReadinessHealthIndicator = {
  key:
    | "fleet_health"
    | "implementation_health"
    | "integration_health"
    | "recommendation_readiness"
    | "data_quality"
    | "historical_coverage"
    | "gps_coverage"
    | "revenue_coverage"
    | "import_quality";
  label: string;
  status: "healthy" | "warning" | "critical";
  currentStatus: string;
  whyItMatters: string;
  recommendedAction: string;
  navigateTo: string;
};

export type ReadinessIssue = {
  key:
    | "duplicate_trucks"
    | "duplicate_operators"
    | "missing_branch"
    | "missing_revenue"
    | "missing_job_dates"
    | "missing_gps"
    | "missing_customer"
    | "incomplete_historical_data"
    | "stale_integrations"
    | "failed_imports";
  severity: "critical" | "warning" | "info";
  title: string;
  explanation: string;
  recommendedFix: string;
  navigateTo: string;
  count: number;
};

export async function loadReadinessSnapshot(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ReadinessSnapshot> {
  const [
    connections,
    importBatches,
    jobs,
    branches,
    operators,
    customers,
    sites,
    trucks,
    trucksWithTelemetry,
    recommendations,
    martFreshness,
    missingRevenueJobs,
    missingJobDates,
    missingBranchJobs,
    missingCustomerJobs,
    failedImports,
    duplicateTruckRows,
    duplicateOperatorRows,
    staleIntegrations,
  ] = await Promise.all([
    fetchActiveConnectionsCount(supabase, tenantId),
    fetchCompletedImportsCount(supabase, tenantId),
    fetchJobsCount(supabase, tenantId),
    fetchBranchesCount(supabase, tenantId),
    fetchOperatorsCount(supabase, tenantId),
    fetchCustomersCount(supabase, tenantId),
    fetchSitesCount(supabase, tenantId),
    fetchTrucksCount(supabase, tenantId),
    fetchTrucksWithTelemetryCount(supabase, tenantId),
    fetchPendingRecommendationsCount(supabase, tenantId),
    fetchMartFreshness(supabase, tenantId),
    fetchMissingRevenueJobsCount(supabase, tenantId),
    fetchMissingJobDatesCount(supabase, tenantId),
    fetchMissingBranchJobsCount(supabase, tenantId),
    fetchMissingCustomerJobsCount(supabase, tenantId),
    fetchFailedImportsCount(supabase, tenantId),
    fetchDuplicateTrucksCount(supabase, tenantId),
    fetchDuplicateOperatorsCount(supabase, tenantId),
    fetchStaleIntegrationsCount(supabase, tenantId),
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
      status:
        jobs >= 10 && trucksWithTelemetry >= 5
          ? "ready"
          : jobs > 0 && trucksWithTelemetry > 0
            ? "warning"
            : "blocked",
      detail: `${jobs} jobs, ${trucksWithTelemetry} trucks with telematics`,
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
    branches > 0 ? 1 : 0,
    operators > 0 ? 1 : 0,
    jobs > 0 ? 1 : 0,
    trucksWithTelemetry > 0 ? 1 : 0,
    recommendations > 0 ? 1 : 0,
  ];
  const implementationProgressPct = Math.round(
    (implementationSignals.reduce((total, value) => total + value, 0) / implementationSignals.length) *
      100
  );

  const issues: ReadinessIssue[] = [
    {
      key: "duplicate_trucks",
      severity: "warning",
      title: "Duplicate Trucks",
      explanation: "Duplicate truck unit numbers reduce dispatch confidence and utilization accuracy.",
      recommendedFix: "Deduplicate truck unit numbers or provide unique external IDs during import.",
      navigateTo: "/implementation/imports",
      count: duplicateTruckRows,
    },
    {
      key: "duplicate_operators",
      severity: "warning",
      title: "Duplicate Operators",
      explanation: "Duplicate operator names can split labor and assignment history.",
      recommendedFix: "Merge duplicate operator rows and preserve one canonical operator profile.",
      navigateTo: "/implementation/imports",
      count: duplicateOperatorRows,
    },
    {
      key: "missing_branch",
      severity: "critical",
      title: "Missing Branch",
      explanation: "Jobs without branches cannot be reliably dispatched to regional resources.",
      recommendedFix: "Populate branch mappings before executing job imports.",
      navigateTo: "/implementation/imports",
      count: missingBranchJobs,
    },
    {
      key: "missing_revenue",
      severity: "critical",
      title: "Missing Revenue",
      explanation: "Revenue coverage is required for contribution and baseline trust.",
      recommendedFix: "Map revenue fields and backfill missing values in job data.",
      navigateTo: "/implementation/imports",
      count: missingRevenueJobs,
    },
    {
      key: "missing_job_dates",
      severity: "warning",
      title: "Missing Job Dates",
      explanation: "Missing job windows reduce scheduling and recommendation quality.",
      recommendedFix: "Provide scheduled start and end timestamps for every dispatchable job.",
      navigateTo: "/implementation/imports",
      count: missingJobDates,
    },
    {
      key: "missing_gps",
      severity: "critical",
      title: "Missing GPS",
      explanation: "Telematics coverage is necessary for dispatch, deadhead, and utilization analytics.",
      recommendedFix: "Connect telematics and verify each truck has recent GPS events.",
      navigateTo: "/implementation/connections",
      count: Math.max(0, trucks - trucksWithTelemetry),
    },
    {
      key: "missing_customer",
      severity: "warning",
      title: "Missing Customer",
      explanation: "Jobs without customer/site attribution weaken operational reporting and billing traceability.",
      recommendedFix: "Map customer/site references when importing jobs and sites.",
      navigateTo: "/implementation/imports",
      count: missingCustomerJobs,
    },
    {
      key: "incomplete_historical_data",
      severity: "warning",
      title: "Incomplete Historical Data",
      explanation: "Baseline confidence depends on complete historical utilization and revenue coverage.",
      recommendedFix: "Import 90–365 days of historical data and refresh baseline.",
      navigateTo: "/implementation/baseline",
      count: martFreshness.hasData ? 0 : 1,
    },
    {
      key: "stale_integrations",
      severity: "warning",
      title: "Stale Integrations",
      explanation: "Stale connector syncs can produce outdated readiness and recommendation signals.",
      recommendedFix: "Review connector health, resolve sync errors, and retry failed syncs.",
      navigateTo: "/implementation/sync-history",
      count: staleIntegrations,
    },
    {
      key: "failed_imports",
      severity: "critical",
      title: "Failed Imports",
      explanation: "Failed imports leave onboarding entities incomplete and unreliable.",
      recommendedFix: "Re-run failed batches after fixing validation issues.",
      navigateTo: "/implementation/imports",
      count: failedImports,
    },
  ];

  const criticalIssueCount = issues.filter((issue) => issue.severity === "critical" && issue.count > 0).length;
  const warningIssueCount = issues.filter((issue) => issue.severity === "warning" && issue.count > 0).length;
  const openIssueCount = issues.filter((issue) => issue.count > 0).length;

  const gpsCoveragePct = trucks > 0 ? Math.round((trucksWithTelemetry / trucks) * 100) : 0;
  const revenueCoveragePct = jobs > 0 ? Math.round(((jobs - missingRevenueJobs) / jobs) * 100) : 0;
  const importQualityPct =
    importBatches > 0
      ? Math.max(0, 100 - Math.round((failedImports / importBatches) * 100))
      : 0;

  const healthIndicators: ReadinessHealthIndicator[] = [
    {
      key: "fleet_health",
      label: "Fleet Health",
      status: criticalIssueCount > 0 ? "critical" : warningIssueCount > 0 ? "warning" : "healthy",
      currentStatus:
        criticalIssueCount > 0
          ? `${criticalIssueCount} critical issue(s)`
          : warningIssueCount > 0
            ? `${warningIssueCount} warning issue(s)`
            : "Operationally healthy",
      whyItMatters: "Fleet health determines dispatch reliability and operator trust in daily decisions.",
      recommendedAction: "Resolve critical data quality and integration issues before pilot operations.",
      navigateTo: "/implementation/readiness",
    },
    {
      key: "implementation_health",
      label: "Implementation Health",
      status:
        implementationProgressPct >= 85
          ? "healthy"
          : implementationProgressPct >= 55
            ? "warning"
            : "critical",
      currentStatus: `${implementationProgressPct}% complete`,
      whyItMatters: "Implementation completeness drives onboarding speed and pilot confidence.",
      recommendedAction: "Complete remaining checklist items and validate imported entities.",
      navigateTo: "/implementation",
    },
    {
      key: "integration_health",
      label: "Integration Health",
      status:
        connections === 0
          ? "critical"
          : staleIntegrations > 0
            ? "warning"
            : "healthy",
      currentStatus:
        connections === 0
          ? "No active connectors"
          : staleIntegrations > 0
            ? `${staleIntegrations} stale connector(s)`
            : "All connectors healthy",
      whyItMatters: "Fresh connector syncs keep dispatch, baseline, and recommendation data current.",
      recommendedAction: "Connect missing systems and resolve stale sync activity.",
      navigateTo: "/implementation/connections",
    },
    {
      key: "recommendation_readiness",
      label: "Recommendation Readiness",
      status:
        recommendations > 0 && jobs >= 10 && trucksWithTelemetry >= 5
          ? "healthy"
          : recommendations > 0 || jobs > 0
            ? "warning"
            : "critical",
      currentStatus:
        recommendations > 0
          ? `${recommendations} pending recommendation(s)`
          : "Recommendation queue not yet generated",
      whyItMatters: "Recommendation readiness indicates decision-support coverage for dispatch.",
      recommendedAction: "Increase job and telemetry coverage, then refresh recommendations.",
      navigateTo: "/implementation/readiness",
    },
    {
      key: "data_quality",
      label: "Data Quality",
      status:
        openIssueCount === 0
          ? "healthy"
          : criticalIssueCount > 0
            ? "critical"
            : "warning",
      currentStatus:
        openIssueCount === 0 ? "No open data quality issues" : `${openIssueCount} open issue(s)`,
      whyItMatters: "Data quality directly impacts recommendation confidence and operator trust.",
      recommendedAction: "Address duplicate and missing-field issues before dispatching at scale.",
      navigateTo: "/implementation/readiness",
    },
    {
      key: "historical_coverage",
      label: "Historical Coverage",
      status:
        martFreshness.isFresh
          ? "healthy"
          : martFreshness.hasData
            ? "warning"
            : "critical",
      currentStatus: martFreshness.detail,
      whyItMatters: "Historical coverage supports reliable baseline metrics and trend analysis.",
      recommendedAction: "Load historical utilization/revenue data and refresh marts.",
      navigateTo: "/implementation/baseline",
    },
    {
      key: "gps_coverage",
      label: "GPS Coverage",
      status:
        gpsCoveragePct >= 80
          ? "healthy"
          : gpsCoveragePct >= 40
            ? "warning"
            : "critical",
      currentStatus: `${gpsCoveragePct}% trucks reporting telemetry`,
      whyItMatters: "GPS coverage drives dispatch accuracy, deadhead tracking, and utilization analytics.",
      recommendedAction: "Connect telematics and backfill missing truck-device mapping.",
      navigateTo: "/implementation/connections",
    },
    {
      key: "revenue_coverage",
      label: "Revenue Coverage",
      status:
        revenueCoveragePct >= 80
          ? "healthy"
          : revenueCoveragePct >= 50
            ? "warning"
            : "critical",
      currentStatus: `${revenueCoveragePct}% jobs include revenue`,
      whyItMatters: "Revenue coverage is required for baseline contribution and recommendation impact projections.",
      recommendedAction: "Map and validate revenue fields during job imports.",
      navigateTo: "/implementation/imports",
    },
    {
      key: "import_quality",
      label: "Import Quality",
      status:
        importQualityPct >= 85
          ? "healthy"
          : importQualityPct >= 60
            ? "warning"
            : "critical",
      currentStatus:
        importBatches === 0
          ? "No completed import batches"
          : `${importQualityPct}% quality across ${importBatches} completed batch(es)`,
      whyItMatters: "Import quality determines whether foundational entities are pilot-ready.",
      recommendedAction: "Resolve failed imports and rerun validation-critical batches.",
      navigateTo: "/implementation/imports",
    },
  ];

  return {
    implementationProgressPct,
    readinessScorePct,
    checks,
    healthIndicators,
    issues,
    counts: {
      connectorsActive: connections,
      importsCompleted: importBatches,
      jobs,
      branches,
      operators,
      customers,
      sites,
      trucksTotal: trucks,
      trucksWithTelematics,
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

async function fetchBranchesCount(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchOperatorsCount(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("fleet_operators")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchCustomersCount(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchSitesCount(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("customer_sites")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchTrucksCount(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("trucks")
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

async function fetchMissingRevenueJobsCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .or("revenue_estimate.is.null,revenue_estimate.lte.0");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchMissingJobDatesCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .or("scheduled_start.is.null,scheduled_end.is.null");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchMissingBranchJobsCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("branch_id", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchMissingCustomerJobsCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("customer_site_id", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchFailedImportsCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const [failedStatus, erroredRows] = await Promise.all([
    supabase
      .from("integration_import_batches")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "failed"),
    supabase
      .from("integration_import_batches")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gt("error_rows", 0),
  ]);
  if (failedStatus.error) throw new Error(failedStatus.error.message);
  if (erroredRows.error) throw new Error(erroredRows.error.message);
  return Math.max(failedStatus.count ?? 0, erroredRows.count ?? 0);
}

async function fetchDuplicateTrucksCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("trucks")
    .select("unit_number")
    .eq("tenant_id", tenantId)
    .not("unit_number", "is", null)
    .limit(2000);
  if (error) throw new Error(error.message);
  const byUnit = new Map<string, number>();
  for (const row of data ?? []) {
    const unit = String((row as { unit_number?: string | null }).unit_number ?? "").trim().toLowerCase();
    if (!unit) continue;
    byUnit.set(unit, (byUnit.get(unit) ?? 0) + 1);
  }
  let duplicateRows = 0;
  for (const value of byUnit.values()) {
    if (value > 1) duplicateRows += value - 1;
  }
  return duplicateRows;
}

async function fetchDuplicateOperatorsCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("fleet_operators")
    .select("name")
    .eq("tenant_id", tenantId)
    .not("name", "is", null)
    .limit(2000);
  if (error) throw new Error(error.message);
  const byName = new Map<string, number>();
  for (const row of data ?? []) {
    const name = String((row as { name?: string | null }).name ?? "").trim().toLowerCase();
    if (!name) continue;
    byName.set(name, (byName.get(name) ?? 0) + 1);
  }
  let duplicateRows = 0;
  for (const value of byName.values()) {
    if (value > 1) duplicateRows += value - 1;
  }
  return duplicateRows;
}

async function fetchStaleIntegrationsCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const connections = await listIntegrationConnections(supabase, tenantId);
  return connections.filter((connection) => {
    const health = computeConnectorHealth(connection);
    return health.status === "warning" || health.status === "error";
  }).length;
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
