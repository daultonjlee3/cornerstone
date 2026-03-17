/**
 * Super admin "acting tenant" — cookie-based tenant switch.
 * When set, auth context uses this tenant for tenantId/companyIds so the super admin can work inside any tenant.
 */

import { cookies } from "next/headers";

const ACTING_TENANT_COOKIE = "cornerstone_acting_tenant_id";

/** Read acting tenant id from cookie. Only meaningful when current user is a platform super admin. */
export async function getActingTenantIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACTING_TENANT_COOKIE)?.value?.trim();
  if (!value) return null;
  // Basic UUID-like check
  if (value.length < 30) return null;
  return value;
}

/** Set acting tenant cookie (call from Server Action after super-admin check). */
export async function setActingTenantCookie(tenantId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTING_TENANT_COOKIE, tenantId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/** Clear acting tenant cookie. */
export async function clearActingTenantCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTING_TENANT_COOKIE);
}
