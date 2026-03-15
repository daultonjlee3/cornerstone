/**
 * Centralized auth and tenant/company context for server-side use.
 * Use these helpers in Server Actions, route handlers, and loaders.
 * When impersonating, tenant/company/role resolve from the acting (effective) user.
 */

import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import {
  getImpersonationStateFromCookie,
  getEffectiveUserId as getEffectiveUserIdFromCookie,
} from "@/src/lib/impersonation";
import { getActingTenantIdFromCookie } from "@/src/lib/acting-tenant";

export type TenantMembershipRole = "owner" | "admin" | "member" | "viewer";

export type AuthContext = {
  user: User;
  userId: string;
  /** When impersonating, this is the acting user id; otherwise same as userId. */
  effectiveUserId: string;
  isImpersonating: boolean;
  tenantId: string;
  companyIds: string[];
  defaultCompanyId: string | null;
  membershipRole: TenantMembershipRole | null;
  isPlatformSuperAdmin: boolean;
};

export async function getSupabaseClient(): Promise<Awaited<ReturnType<typeof createClient>>> {
  return createClient();
}

/** Current authenticated user (real session) or null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/** Effective user ID: acting-as when impersonating, else auth user id. */
export async function getEffectiveUserId(
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const client = supabase ?? (await getSupabaseClient());
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  return getEffectiveUserIdFromCookie(user.id);
}

/** Impersonation state from cookie; original user is from auth. */
export async function getImpersonationState(): Promise<{
  originalUserId: string;
  actingAsUserId: string;
  startedAt: string;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const fromCookie = await getImpersonationStateFromCookie();
  if (!fromCookie) return null;
  return { originalUserId: user.id, actingAsUserId: fromCookie.actingAsUserId, startedAt: fromCookie.startedAt };
}

/** Tenant ID for the effective user (first membership). Super admins can use acting-tenant cookie to work in any tenant. */
export async function getTenantIdForUser(
  supabase?: Awaited<ReturnType<typeof createClient>>,
  effectiveUserId?: string | null
): Promise<string | null> {
  const client = supabase ?? (await getSupabaseClient());
  const {
    data: { user: authUser },
  } = await client.auth.getUser();
  if (!authUser) return null;
  // Super admin "jump tenant": use acting-tenant cookie when set
  if (await isUserPlatformSuperAdmin(authUser.id, client)) {
    const actingTenantId = await getActingTenantIdFromCookie();
    if (actingTenantId) return actingTenantId;
  }
  const userId = effectiveUserId ?? (await getEffectiveUserId(client));
  if (!userId) return null;
  const { data } = await client
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return (data as { tenant_id?: string } | null)?.tenant_id ?? null;
}

/** Company IDs the current user can access (all companies in their tenant). */
export async function getCompanyIdsForUser(
  supabase?: Awaited<ReturnType<typeof createClient>>,
  effectiveUserId?: string | null
): Promise<string[]> {
  const tenantId = await getTenantIdForUser(supabase, effectiveUserId);
  if (!tenantId) return [];
  const client = supabase ?? (await getSupabaseClient());
  const { data } = await client
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("name");
  const rows = (data ?? []) as { id: string }[];
  return rows.map((r) => r.id);
}

/** First/default company ID for the effective user (for single-company UX). */
export async function getDefaultCompanyIdForUser(
  supabase?: Awaited<ReturnType<typeof createClient>>,
  effectiveUserId?: string | null
): Promise<string | null> {
  const ids = await getCompanyIdsForUser(supabase, effectiveUserId);
  return ids[0] ?? null;
}

/** Tenant membership role for the effective user (first membership). */
export async function getMembershipRoleForUser(
  supabase?: Awaited<ReturnType<typeof createClient>>,
  effectiveUserId?: string | null
): Promise<TenantMembershipRole | null> {
  const client = supabase ?? (await getSupabaseClient());
  const userId = effectiveUserId ?? (await getEffectiveUserId(client));
  if (!userId) return null;
  const { data } = await client
    .from("tenant_memberships")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  if (!role) return null;
  if (["owner", "admin", "member", "viewer"].includes(role)) return role as TenantMembershipRole;
  return null;
}

/** True if the given user id is in platform_super_admins. Use real auth user id, not acting. */
export async function isUserPlatformSuperAdmin(
  userId: string,
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const client = supabase ?? (await getSupabaseClient());
  const { data } = await client
    .from("platform_super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/** True if the current auth user (real session) is in platform_super_admins. */
export async function isPlatformSuperAdmin(
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const client = supabase ?? (await getSupabaseClient());
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return false;
  return isUserPlatformSuperAdmin(user.id, client);
}

/**
 * True if company belongs to the given tenant.
 * Use when validating client-provided company_id in server actions and API handlers:
 * resolve tenant via getTenantIdForUser, then call this before using company_id in writes or scoped queries.
 */
export async function companyBelongsToTenant(
  companyId: string,
  tenantId: string,
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const client = supabase ?? (await getSupabaseClient());
  const { data } = await client
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return !!data;
}

/**
 * Throws if the given company is not in the current user's scope (tenant or super-admin).
 * Use in server actions after reading company_id from formData/params to enforce tenant isolation.
 */
export async function ensureCompanyInScope(
  companyId: string,
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  const allowed = await canAccessCompany(companyId, supabase);
  if (!allowed) throw new Error("Unauthorized.");
}

/** Full auth context for the current request. Throws if not authenticated or no tenant. Uses effective user for tenant/role when impersonating. */
export async function getAuthContext(
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<AuthContext> {
  const client = supabase ?? (await getSupabaseClient());
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized.");

  const effectiveUserId = await getEffectiveUserId(client);
  const resolvedEffective = effectiveUserId ?? user.id;
  const isImpersonating = effectiveUserId !== null && effectiveUserId !== user.id;

  const [tenantId, companyIds, membershipRole, isPlatformSuperAdminFlag] = await Promise.all([
    getTenantIdForUser(client, resolvedEffective),
    getCompanyIdsForUser(client, resolvedEffective),
    getMembershipRoleForUser(client, resolvedEffective),
    isPlatformSuperAdmin(client),
  ]);

  if (!tenantId && !isPlatformSuperAdminFlag) throw new Error("No tenant membership.");

  const defaultCompanyId = companyIds[0] ?? null;

  return {
    user,
    userId: user.id,
    effectiveUserId: resolvedEffective,
    isImpersonating: !!isImpersonating,
    tenantId: tenantId ?? "",
    companyIds,
    defaultCompanyId,
    membershipRole,
    isPlatformSuperAdmin: isPlatformSuperAdminFlag,
  };
}

/** Require auth and return context; redirect or throw in layout/actions as needed. */
export async function requireAuth(
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<AuthContext> {
  return getAuthContext(supabase);
}

/**
 * Check if current user can access the given company (either in their tenant or super admin).
 * Use to validate client-provided company_id before using it in queries or writes.
 */
export async function canAccessCompany(
  companyId: string,
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const client = supabase ?? (await getSupabaseClient());
  if (await isPlatformSuperAdmin(client)) return true;
  const tenantId = await getTenantIdForUser(client);
  if (!tenantId) return false;
  return companyBelongsToTenant(companyId, tenantId, client);
}
