/**
 * Permission model: built-in role-to-permission mapping.
 * Enforce server-side in actions and route handlers via requirePermission().
 *
 * Roles (least → most privileged): viewer → member → admin → owner → platform_super_admin
 * demo_guest: read-heavy access for demo/trial accounts; cannot delete or approve.
 */

import {
  getCurrentUser,
  getMembershipRoleForUser,
  getSupabaseClient,
  isPlatformSuperAdmin,
  type TenantMembershipRole,
} from "@/src/lib/auth-context";

/** Module.action style permissions used for server-action checks. */
export type Permission =
  | "assets.view"
  | "assets.create"
  | "assets.edit"
  | "assets.delete"
  | "work_orders.view"
  | "work_orders.create"
  | "work_orders.assign"
  | "work_orders.edit"
  | "work_orders.complete"
  | "work_orders.close"
  | "work_orders.delete"
  | "dispatch.view"
  | "dispatch.manage"
  | "pm.view"
  | "pm.create"
  | "pm.edit"
  | "pm.delete"
  | "inventory.view"
  | "inventory.transact"
  | "inventory.manage"
  | "purchase_orders.view"
  | "purchase_orders.create"
  | "purchase_orders.approve"
  | "purchase_orders.delete"
  | "vendors.view"
  | "vendors.manage"
  | "vendors.delete"
  | "reports.view"
  | "reports.create"
  | "reports.share"
  | "users.manage"
  | "settings.manage"
  | "properties.view"
  | "properties.manage"
  | "buildings.view"
  | "buildings.manage"
  | "units.view"
  | "units.manage"
  | "technicians.view"
  | "technicians.manage"
  | "customers.view"
  | "customers.manage"
  | "companies.view"
  | "companies.manage";

/** Extended role type — includes demo_guest for trial/demo accounts. */
type AnyRole = TenantMembershipRole | "platform_super_admin" | "demo_guest";

/** Built-in role to permissions. Owner/admin get full access; member/viewer limited. */
const ROLE_PERMISSIONS: Record<AnyRole, Permission[]> = {
  platform_super_admin: [
    "assets.view", "assets.create", "assets.edit", "assets.delete",
    "work_orders.view", "work_orders.create", "work_orders.assign",
    "work_orders.edit", "work_orders.complete", "work_orders.close", "work_orders.delete",
    "dispatch.view", "dispatch.manage",
    "pm.view", "pm.create", "pm.edit", "pm.delete",
    "inventory.view", "inventory.transact", "inventory.manage",
    "purchase_orders.view", "purchase_orders.create", "purchase_orders.approve", "purchase_orders.delete",
    "vendors.view", "vendors.manage", "vendors.delete",
    "reports.view", "reports.create", "reports.share",
    "users.manage", "settings.manage",
    "properties.view", "properties.manage",
    "buildings.view", "buildings.manage",
    "units.view", "units.manage",
    "technicians.view", "technicians.manage",
    "customers.view", "customers.manage",
    "companies.view", "companies.manage",
  ],
  owner: [
    "assets.view", "assets.create", "assets.edit", "assets.delete",
    "work_orders.view", "work_orders.create", "work_orders.assign",
    "work_orders.edit", "work_orders.complete", "work_orders.close", "work_orders.delete",
    "dispatch.view", "dispatch.manage",
    "pm.view", "pm.create", "pm.edit", "pm.delete",
    "inventory.view", "inventory.transact", "inventory.manage",
    "purchase_orders.view", "purchase_orders.create", "purchase_orders.approve", "purchase_orders.delete",
    "vendors.view", "vendors.manage", "vendors.delete",
    "reports.view", "reports.create", "reports.share",
    "users.manage", "settings.manage",
    "properties.view", "properties.manage",
    "buildings.view", "buildings.manage",
    "units.view", "units.manage",
    "technicians.view", "technicians.manage",
    "customers.view", "customers.manage",
    "companies.view", "companies.manage",
  ],
  admin: [
    "assets.view", "assets.create", "assets.edit", "assets.delete",
    "work_orders.view", "work_orders.create", "work_orders.assign",
    "work_orders.edit", "work_orders.complete", "work_orders.close", "work_orders.delete",
    "dispatch.view", "dispatch.manage",
    "pm.view", "pm.create", "pm.edit", "pm.delete",
    "inventory.view", "inventory.transact", "inventory.manage",
    "purchase_orders.view", "purchase_orders.create", "purchase_orders.approve", "purchase_orders.delete",
    "vendors.view", "vendors.manage", "vendors.delete",
    "reports.view", "reports.create", "reports.share",
    "users.manage", "settings.manage",
    "properties.view", "properties.manage",
    "buildings.view", "buildings.manage",
    "units.view", "units.manage",
    "technicians.view", "technicians.manage",
    "customers.view", "customers.manage",
    "companies.view", "companies.manage",
  ],
  member: [
    "assets.view", "assets.create", "assets.edit",
    "work_orders.view", "work_orders.create", "work_orders.assign",
    "work_orders.edit", "work_orders.complete",
    "dispatch.view", "dispatch.manage",
    "pm.view", "pm.create", "pm.edit",
    "inventory.view", "inventory.transact",
    "purchase_orders.view", "purchase_orders.create",
    "vendors.view",
    "reports.view",
    "properties.view",
    "buildings.view",
    "units.view",
    "technicians.view",
    "customers.view",
    "companies.view",
  ],
  viewer: [
    "assets.view",
    "work_orders.view",
    "dispatch.view",
    "pm.view",
    "inventory.view",
    "purchase_orders.view",
    "vendors.view",
    "reports.view",
    "properties.view",
    "buildings.view",
    "units.view",
    "technicians.view",
    "customers.view",
    "companies.view",
  ],
  /**
   * demo_guest: read + create/edit access for exploring the demo environment.
   * Cannot delete records, approve POs, or manage settings/users.
   * This prevents demo visitors from irreversibly damaging seeded demo data.
   */
  demo_guest: [
    "assets.view", "assets.create", "assets.edit",
    "work_orders.view", "work_orders.create", "work_orders.assign",
    "work_orders.edit", "work_orders.complete",
    "dispatch.view", "dispatch.manage",
    "pm.view", "pm.create", "pm.edit",
    "inventory.view", "inventory.transact",
    "purchase_orders.view", "purchase_orders.create",
    "vendors.view",
    "reports.view",
    "properties.view",
    "buildings.view",
    "units.view",
    "technicians.view",
    "customers.view",
    "companies.view",
  ],
};

/**
 * Check if the current user has the given permission.
 * Returns false for unauthenticated users and for roles not in the model.
 */
export async function can(permission: Permission): Promise<boolean> {
  const supabase = await getSupabaseClient();
  const user = await getCurrentUser();
  if (!user) return false;
  if (await isPlatformSuperAdmin(supabase)) return true;
  const role = await getMembershipRoleForUser(supabase);
  if (!role) {
    // Check if this is a demo_guest role (not in TenantMembershipRole union)
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const rawRole = (membership as { role?: string } | null)?.role;
    if (rawRole === "demo_guest") {
      return Array.isArray(ROLE_PERMISSIONS.demo_guest) &&
        ROLE_PERMISSIONS.demo_guest.includes(permission);
    }
    return false;
  }
  const allowed = ROLE_PERMISSIONS[role as AnyRole];
  return Array.isArray(allowed) && allowed.includes(permission);
}

/**
 * Require a permission in a server action — throws if the current user lacks it.
 * Usage: await requirePermission("work_orders.delete");
 */
export async function requirePermission(permission: Permission): Promise<void> {
  const allowed = await can(permission);
  if (!allowed) throw new Error("You do not have permission to perform this action.");
}
