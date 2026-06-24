import type { SupabaseClient } from "@supabase/supabase-js";

export async function listBranchesForTenant(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listTrucksForTenant(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("trucks")
    .select("*, branches(name, code)")
    .eq("tenant_id", tenantId)
    .order("unit_number");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listFleetJobsForTenant(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("fleet_jobs")
    .select("*, customer_sites(name), trucks(unit_number), branches(name, code)")
    .eq("tenant_id", tenantId)
    .order("scheduled_start", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listCustomerSitesForTenant(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("customer_sites")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listFleetOperatorsForTenant(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("fleet_operators")
    .select("*, branches(name, code)")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

const DEFAULT_ONLINE_THRESHOLD_MS = 10 * 60 * 1000;

export function computeTelematicsStatus(
  lastTelematicsAt: string | null | undefined,
  thresholdMs = DEFAULT_ONLINE_THRESHOLD_MS
): "online" | "stale" | "offline" {
  if (!lastTelematicsAt) return "offline";
  const age = Date.now() - Date.parse(lastTelematicsAt);
  if (Number.isNaN(age)) return "offline";
  if (age <= thresholdMs) return "online";
  if (age <= thresholdMs * 3) return "stale";
  return "offline";
}

export async function listTruckLatestPositions(
  supabase: SupabaseClient,
  tenantId: string
): Promise<
  Array<{
    truck_id: string;
    recorded_at: string;
    latitude: number;
    longitude: number;
    speed_mph: number | null;
    source: string;
  }>
> {
  const { data, error } = await supabase
    .from("truck_latest_position")
    .select("truck_id, recorded_at, latitude, longitude, speed_mph, source")
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    truck_id: string;
    recorded_at: string;
    latitude: number;
    longitude: number;
    speed_mph: number | null;
    source: string;
  }>;
}
