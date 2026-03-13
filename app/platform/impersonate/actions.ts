"use server";

import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isPlatformSuperAdmin,
  getTenantIdForUser,
  isUserPlatformSuperAdmin,
} from "@/src/lib/auth-context";
import { setImpersonationCookie, clearImpersonationCookie } from "@/src/lib/impersonation";
import { insertActivityLog } from "@/src/lib/activity-logs";

/**
 * Platform super admin can impersonate any user except other platform_super_admins.
 * Returns error message or null on success (then redirect).
 */
export async function startImpersonationPlatform(actingAsUserId: string): Promise<string | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return "Unauthorized.";

  const isSuperAdmin = await isPlatformSuperAdmin(supabase);
  if (!isSuperAdmin) return "Only platform super admins can impersonate from here.";

  const targetIsSuperAdmin = await isUserPlatformSuperAdmin(actingAsUserId, supabase);
  if (targetIsSuperAdmin) return "Cannot impersonate another platform super admin.";

  const { data: targetUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", actingAsUserId)
    .maybeSingle();
  if (!targetUser) return "User not found.";

  const { data: targetMembership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", actingAsUserId)
    .limit(1)
    .maybeSingle();
  const tenantId = (targetMembership as { tenant_id?: string } | null)?.tenant_id ?? null;
  const { data: company } = tenantId
    ? await supabase.from("companies").select("id").eq("tenant_id", tenantId).limit(1).maybeSingle()
    : { data: null };
  const companyId = (company as { id?: string } | null)?.id ?? null;

  await setImpersonationCookie(actingAsUserId);
  await insertActivityLog(supabase, {
    tenantId: tenantId ?? undefined,
    companyId: companyId ?? undefined,
    entityType: "impersonation",
    entityId: actingAsUserId,
    actionType: "impersonation_start",
    performedBy: user.id,
    metadata: {
      impersonator_user_id: user.id,
      impersonated_user_id: actingAsUserId,
      started_at: new Date().toISOString(),
      scope: "platform",
    },
  });
  return null;
}

/**
 * Tenant admin can impersonate only users in their own tenant, and not platform_super_admins.
 */
export async function startImpersonationTenant(actingAsUserId: string): Promise<string | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return "Unauthorized.";

  const myTenantId = await getTenantIdForUser(supabase, user.id);
  if (!myTenantId) return "You have no tenant membership.";

  const { data: myMembership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", myTenantId)
    .maybeSingle();
  const role = (myMembership as { role?: string } | null)?.role;
  const canImpersonate = role === "owner" || role === "admin";
  if (!canImpersonate) return "Only tenant owners and admins can impersonate users.";

  const targetIsSuperAdmin = await isUserPlatformSuperAdmin(actingAsUserId, supabase);
  if (targetIsSuperAdmin) return "Cannot impersonate a platform super admin.";

  const { data: targetMembership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", actingAsUserId)
    .eq("tenant_id", myTenantId)
    .maybeSingle();
  if (!targetMembership) return "User is not in your tenant.";

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", myTenantId)
    .limit(1)
    .maybeSingle();
  const companyId = (company as { id?: string } | null)?.id ?? null;

  await setImpersonationCookie(actingAsUserId);
  await insertActivityLog(supabase, {
    tenantId: myTenantId,
    companyId: companyId ?? undefined,
    entityType: "impersonation",
    entityId: actingAsUserId,
    actionType: "impersonation_start",
    performedBy: user.id,
    metadata: {
      impersonator_user_id: user.id,
      impersonated_user_id: actingAsUserId,
      started_at: new Date().toISOString(),
      scope: "tenant",
    },
  });
  return null;
}

/**
 * End impersonation: clear cookie, log end, redirect. No logout.
 */
export async function endImpersonation(returnPath?: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized." };

  const { getImpersonationStateFromCookie } = await import("@/src/lib/impersonation");
  const state = await getImpersonationStateFromCookie();
  if (state) {
    await insertActivityLog(supabase, {
      entityType: "impersonation",
      entityId: state.actingAsUserId,
      actionType: "impersonation_end",
      performedBy: user.id,
      metadata: {
        impersonator_user_id: user.id,
        impersonated_user_id: state.actingAsUserId,
        ended_at: new Date().toISOString(),
      },
    });
  }

  await clearImpersonationCookie();
  redirect(returnPath ?? "/dashboard");
}
