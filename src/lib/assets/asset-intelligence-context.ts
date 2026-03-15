import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";

export type AssetIntelligenceContext = {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string;
  companyId: string;
  asset: Record<string, unknown>;
};

export async function resolveTenantScope(
  supabase: SupabaseClient
): Promise<{ userId: string; tenantId: string; companyIds: string[] }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized.");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) throw new Error("Tenant membership not found.");

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);

  return {
    userId: user.id,
    tenantId,
    companyIds: (companies ?? []).map((row) => row.id),
  };
}

export async function getAssetIntelligenceContext(
  assetId: string,
  existingSupabase?: SupabaseClient
): Promise<AssetIntelligenceContext> {
  const supabase = existingSupabase ?? ((await createClient()) as unknown as SupabaseClient);
  const scope = await resolveTenantScope(supabase);

  const { data: asset } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) throw new Error("Asset not found.");

  const companyId = (asset as { company_id?: string | null }).company_id ?? null;
  const tenantId = (asset as { tenant_id?: string | null }).tenant_id ?? null;
  if (!companyId || !scope.companyIds.includes(companyId)) {
    throw new Error("Unauthorized.");
  }
  if (tenantId && tenantId !== scope.tenantId) {
    throw new Error("Unauthorized.");
  }

  return {
    supabase,
    userId: scope.userId,
    tenantId: scope.tenantId,
    companyId,
    asset: asset as Record<string, unknown>,
  };
}
