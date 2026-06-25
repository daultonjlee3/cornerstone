import type { SupabaseClient } from "@supabase/supabase-js";
import { PEACHTREE_TENANT } from "./constants";

export async function resetPeachtreeFleetDemo(supabase: SupabaseClient): Promise<string | null> {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", PEACHTREE_TENANT.slug)
    .maybeSingle();

  if (!tenant?.id) {
    console.log(`No tenant found with slug "${PEACHTREE_TENANT.slug}". Nothing to reset.`);
    return null;
  }

  const tenantId = tenant.id as string;

  const { error } = await supabase.rpc("reset_fleet_demo_tenant", {
    p_tenant_id: tenantId,
  });

  if (error) {
    if (error.message.includes("reset_fleet_demo_tenant")) {
      throw new Error(
        `Reset RPC failed: ${error.message}\n` +
          "Apply migration 20260624190000_fleet_demo_reset_fn.sql first:\n" +
          "  supabase db push   (or run the migration against your project)"
      );
    }
    throw new Error(`Reset failed: ${error.message}`);
  }

  console.log(`Reset fleet demo data for "${tenant.name}" (${tenantId}).`);
  return tenantId;
}
