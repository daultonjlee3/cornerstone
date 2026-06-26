import type { AuthContext } from "@/src/lib/auth-context";
import { PEACHTREE_TENANT } from "@/scripts/seed-fleet-demo/constants";

export function isPeachtreeDemoTenant(slug: string | null | undefined): boolean {
  return slug === PEACHTREE_TENANT.slug;
}

export function canManagePeachtreeDemoReset(
  auth: AuthContext,
  tenantSlug: string | null | undefined
): boolean {
  if (!isPeachtreeDemoTenant(tenantSlug)) return false;
  if (auth.isPlatformSuperAdmin) return true;
  return auth.membershipRole === "owner" || auth.membershipRole === "admin";
}
