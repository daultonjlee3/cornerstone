import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetCommandCenterData, FleetIntegrationHealthItem } from "@/src/types/fleet";
import { loadTenantProfitabilitySummary } from "@/src/lib/operational-profitability/queries";
import {
  buildIntegrationHealthFromConnections,
} from "@/src/lib/fleet/queries/today-view";
import type { IntegrationConnection } from "@/src/types/fleet";
import { getCachedOperationsSummary } from "./summary-cache";

type IntegrationCacheEntry = {
  health: FleetIntegrationHealthItem[];
  expiresAt: number;
};

const INTEGRATION_TTL_MS = 60_000;
const integrationCache = new Map<string, IntegrationCacheEntry>();

function monthStartIso(date: string): string {
  const d = new Date(`${date}T12:00:00.000Z`);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Reuse summary KPIs; fetch only MTD + profitability fields missing from fast summary. */
export async function enrichCommandCenterForEnrichment(
  supabase: SupabaseClient,
  tenantId: string,
  date: string,
  base: FleetCommandCenterData
): Promise<FleetCommandCenterData> {
  const monthStart = monthStartIso(date);

  const [mtdResult, profitability] = await Promise.all([
    supabase
      .from("utilization_daily")
      .select("revenue, truck_id")
      .eq("tenant_id", tenantId)
      .gte("date", monthStart)
      .lte("date", date),
    loadTenantProfitabilitySummary(supabase, tenantId, date),
  ]);

  if (mtdResult.error) throw new Error(mtdResult.error.message);

  const mtdRows = mtdResult.data ?? [];
  const totalRevenue = mtdRows.reduce(
    (sum, row) => sum + Number((row as { revenue: number }).revenue),
    0
  );
  const revenuePerTruckMtd =
    base.truckCount > 0 ? Math.round((totalRevenue / base.truckCount) * 100) / 100 : null;

  return {
    ...base,
    revenuePerTruckMtd,
    revenueScheduledToday: profitability.revenueScheduledToday ?? base.revenueScheduledToday,
    estimatedContributionToday:
      profitability.estimatedContributionToday ?? base.estimatedContributionToday,
    contributionAtRisk: profitability.contributionAtRisk ?? base.contributionAtRisk,
    revenueAtRisk: profitability.revenueAtRisk ?? base.revenueAtRisk,
    overtimeCostToday: profitability.overtimeCostToday ?? base.overtimeCostToday,
    deadheadCostToday: profitability.deadheadCostToday ?? base.deadheadCostToday,
    idleCostToday: profitability.idleCostToday,
    laborCostToday: profitability.laborCostToday,
    recommendationOpportunity: profitability.recommendationOpportunity,
  };
}

export async function resolveCommandCenterForEnrichment(
  supabase: SupabaseClient,
  tenantId: string,
  date: string,
  fallbackLoader: () => Promise<FleetCommandCenterData>
): Promise<FleetCommandCenterData> {
  const cached = getCachedOperationsSummary(tenantId, date);
  if (cached?.commandCenter) {
    return enrichCommandCenterForEnrichment(supabase, tenantId, date, cached.commandCenter);
  }
  return fallbackLoader();
}

export async function loadIntegrationHealthCached(
  supabase: SupabaseClient,
  tenantId: string
): Promise<FleetIntegrationHealthItem[]> {
  const hit = integrationCache.get(tenantId);
  if (hit && hit.expiresAt > Date.now()) return hit.health;

  const { data, error } = await supabase
    .from("integration_connections")
    .select("id, provider, display_name, status, config, last_sync_at, last_error")
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);

  const health = buildIntegrationHealthFromConnections((data ?? []) as IntegrationConnection[]);
  integrationCache.set(tenantId, { health, expiresAt: Date.now() + INTEGRATION_TTL_MS });
  return health;
}

export function commandCenterFromSummaryCache(
  tenantId: string,
  date: string
): FleetCommandCenterData | null {
  return getCachedOperationsSummary(tenantId, date)?.commandCenter ?? null;
}
