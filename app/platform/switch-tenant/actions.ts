"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { isPlatformSuperAdmin } from "@/src/lib/auth-context";
import { setActingTenantCookie, clearActingTenantCookie } from "@/src/lib/acting-tenant";

/**
 * Switch the current context to the given tenant (super admin only).
 * Sets the acting-tenant cookie and redirects to dashboard.
 */
export async function switchToTenant(tenantId: string): Promise<never> {
  const supabase = await createClient();
  if (!(await isPlatformSuperAdmin(supabase))) {
    redirect("/platform/tenants");
  }
  const trimmed = tenantId?.trim();
  if (!trimmed) {
    redirect("/platform/tenants");
  }
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", trimmed)
    .maybeSingle();
  if (!data?.id) {
    redirect("/platform/tenants");
  }
  await setActingTenantCookie(data.id);
  redirect("/dashboard");
}

/**
 * Clear the acting-tenant cookie so context falls back to your own tenant (or tenant picker).
 */
export async function clearActingTenant(): Promise<never> {
  const supabase = await createClient();
  if (!(await isPlatformSuperAdmin(supabase))) {
    redirect("/platform/tenants");
  }
  await clearActingTenantCookie();
  redirect("/platform/tenants?switch=1");
}
