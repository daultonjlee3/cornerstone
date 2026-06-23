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
