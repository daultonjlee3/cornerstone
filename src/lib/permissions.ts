/**
 * Permission model: built-in role-to-permission mapping.
 * Enforce server-side in actions and route handlers.
 * Future: optional custom role overrides per tenant (not implemented here).
 */

import {
  getCurrentUser,
  getMembershipRoleForUser,
  getSupabaseClient,
  isPlatformSuperAdmin,
  type TenantMembershipRole,
} from "@/src/lib/auth-context";

/** Module.action style permissions used for checks. */
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
  | "dispatch.view"
  | "dispatch.manage"
  | "pm.view"
  | "pm.create"
  | "pm.edit"
  | "inventory.view"
  | "inventory.transact"
  | "inventory.manage"
  | "purchase_orders.view"
  | "purchase_orders.create"
  | "purchase_orders.approve"
  | "vendors.view"
  | "vendors.manage"
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

/** Built-in role to permissions. Owner/admin get full access; member/viewer limited. */
const ROLE_PERMISSIONS: Record<TenantMembershipRole | "platform_super_admin", Permission[]> = {
  platform_super_admin: [
    "assets.view",
    "assets.create",
    "assets.edit",
    "assets.delete",
    "work_orders.view",
    "work_orders.create",
    "work_orders.assign",
    "work_orders.edit",
    "work_orders.complete",
    "work_orders.close",
    "dispatch.view",
    "dispatch.manage",
    "pm.view",
    "pm.create",
    "pm.edit",
    "inventory.view",
    "inventory.transact",
    "inventory.manage",
    "purchase_orders.view",
    "purchase_orders.create",
    "purchase_orders.approve",
    "vendors.view",
    "vendors.manage",
    "reports.view",
    "reports.create",
    "reports.share",
    "users.manage",
    "settings.manage",
    "properties.view",
    "properties.manage",
    "buildings.view",
    "buildings.manage",
    "units.view",
    "units.manage",
    "technicians.view",
    "technicians.manage",
    "customers.view",
    "customers.manage",
    "companies.view",
    "companies.manage",
  ],
  owner: [
    "assets.view",
    "assets.create",
    "assets.edit",
    "assets.delete",
    "work_orders.view",
    "work_orders.create",
    "work_orders.assign",
    "work_orders.edit",
    "work_orders.complete",
    "work_orders.close",
    "dispatch.view",
    "dispatch.manage",
    "pm.view",
    "pm.create",
    "pm.edit",
    "inventory.view",
    "inventory.transact",
    "inventory.manage",
    "purchase_orders.view",
    "purchase_orders.create",
    "purchase_orders.approve",
    "vendors.view",
    "vendors.manage",
    "reports.view",
    "reports.create",
    "reports.share",
    "users.manage",
    "settings.manage",
    "properties.view",
    "properties.manage",
    "buildings.view",
    "buildings.manage",
    "units.view",
    "units.manage",
    "technicians.view",
    "technicians.manage",
    "customers.view",
    "customers.manage",
    "companies.view",
    "companies.manage",
  ],
  admin: [
    "assets.view",
    "assets.create",
    "assets.edit",
    "assets.delete",
    "work_orders.view",
    "work_orders.create",
    "work_orders.assign",
    "work_orders.edit",
    "work_orders.complete",
    "work_orders.close",
    "dispatch.view",
    "dispatch.manage",
    "pm.view",
    "pm.create",
    "pm.edit",
    "inventory.view",
    "inventory.transact",
    "inventory.manage",
    "purchase_orders.view",
    "purchase_orders.create",
    "purchase_orders.approve",
    "vendors.view",
    "vendors.manage",
    "reports.view",
    "reports.create",
    "reports.share",
    "users.manage",
    "settings.manage",
    "properties.view",
    "properties.manage",
    "buildings.view",
    "buildings.manage",
    "units.view",
    "units.manage",
    "technicians.view",
    "technicians.manage",
    "customers.view",
    "customers.manage",
    "companies.view",
    "companies.manage",
  ],
  member: [
    "assets.view",
    "assets.create",
    "assets.edit",
    "work_orders.view",
    "work_orders.create",
    "work_orders.assign",
    "work_orders.edit",
    "work_orders.complete",
    "dispatch.view",
    "dispatch.manage",
    "pm.view",
    "pm.create",
    "pm.edit",
    "inventory.view",
    "inventory.transact",
    "purchase_orders.view",
    "purchase_orders.create",
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
};

/** Check if the current user has the given permission. */
export async function can(permission: Permission): Promise<boolean> {
  const supabase = await getSupabaseClient();
  const user = await getCurrentUser();
  if (!user) return false;
  if (await isPlatformSuperAdmin(supabase)) return true;
  const role = await getMembershipRoleForUser(supabase);
  if (!role) return false;
  const allowed = ROLE_PERMISSIONS[role];
  return Array.isArray(allowed) && allowed.includes(permission);
}

/** Require permission; throw if not allowed. Use in server actions. */
export async function requirePermission(permission: Permission): Promise<void> {
  const allowed = await can(permission);
  if (!allowed) throw new Error("You do not have permission to perform this action.");
}
