import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";

export type ProcurementCompanyScope = {
  id: string;
  name: string;
};

export type ProcurementScope = {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string;
  companies: ProcurementCompanyScope[];
  companyIds: string[];
};

export async function resolveProcurementScope(
  existingSupabase?: SupabaseClient
): Promise<ProcurementScope> {
  const supabase = existingSupabase ?? ((await createClient()) as unknown as SupabaseClient);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized.");
  }

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.tenant_id) {
    throw new Error("Tenant membership not found.");
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", membership.tenant_id)
    .order("name");

  const normalized = (companies ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: (row as { name: string }).name,
  }));

  return {
    supabase,
    userId: user.id,
    tenantId: membership.tenant_id,
    companies: normalized,
    companyIds: normalized.map((row) => row.id),
  };
}

export function companyInScope(companyId: string | null | undefined, companyIds: string[]): boolean {
  if (!companyId) return false;
  return companyIds.includes(companyId);
}
