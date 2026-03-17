import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";

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

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) {
    throw new Error("Tenant membership not found.");
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  const normalized = (companies ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: (row as { name: string }).name,
  }));

  return {
    supabase,
    userId: user.id,
    tenantId,
    companies: normalized,
    companyIds: normalized.map((row) => row.id),
  };
}

export function companyInScope(companyId: string | null | undefined, companyIds: string[]): boolean {
  if (!companyId) return false;
  return companyIds.includes(companyId);
}
