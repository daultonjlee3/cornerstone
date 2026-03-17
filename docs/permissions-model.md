# Permissions Model

## Overview

Cornerstone uses **role-based permissions** with a fixed mapping from **tenant membership role** to a set of **permissions**. There is no custom role builder yet; extension points are described below.

## Roles

### Platform

- **Platform super admin** – User is in `platform_super_admins`. Bypasses tenant checks and has all permissions.

### Tenant (tenant_memberships.role)

- **owner** – Full access within the tenant (all companies in tenant).
- **admin** – Same as owner for the listed permissions.
- **member** – Can view and perform most operational actions; no users/settings manage.
- **viewer** – Read-only for assets, work orders, dispatch, PM, inventory, PO, vendors, reports, properties, buildings, units, technicians, customers, companies.

## Permission List (Module.Action)

Permissions are defined in **`src/lib/permissions.ts`** as strings like `assets.view`, `work_orders.create`, etc.

| Permission | Description |
|------------|-------------|
| assets.view / create / edit / delete | Assets module |
| work_orders.view / create / assign / edit / complete / close | Work orders |
| dispatch.view / manage | Dispatch board |
| pm.view / create / edit | Preventive maintenance |
| inventory.view / transact / manage | Inventory |
| purchase_orders.view / create / approve | Purchase orders |
| vendors.view / manage | Vendors |
| reports.view / create / share | Reports |
| users.manage | User management |
| settings.manage | Settings |
| properties.view / manage | Properties |
| buildings.view / manage | Buildings |
| units.view / manage | Units |
| technicians.view / manage | Technicians |
| customers.view / manage | Customers |
| companies.view / manage | Companies |

## Enforcement

1. **Server-side (required)**  
   In Server Actions, route handlers, and loaders:
   - Resolve tenant/company with **`getAuthContext()`** or **`getTenantIdForUser()`** + **`companyBelongsToTenant()`** (or **`canAccessCompany()`**).
   - For permission checks: **`await can(permission)`** or **`await requirePermission(permission)`** (throws if not allowed).
   - Always filter queries by `company_id` / `tenant_id` for the current context; super admins may see all.

2. **Frontend (optional)**  
   Use permission checks to show/hide UI (e.g. “Create” button). This is for UX only; **security is enforced only on the server**.

## Helpers (src/lib/permissions.ts)

- **`can(permission)`** – Returns `true` if the current user has the permission (super admin or tenant role includes it).
- **`requirePermission(permission)`** – Throws if the user does not have the permission; use in actions.

## Role → Permission Mapping

- Implemented as a constant **`ROLE_PERMISSIONS`** in `permissions.ts`: each role (owner, admin, member, viewer, platform_super_admin) maps to an array of permissions.
- To change what a role can do, edit that mapping and redeploy.

## Future Extension

- **Custom roles per tenant** – Add tables like `tenant_roles` and `tenant_role_permissions` and resolve permission by custom role when present, falling back to built-in role.
- **Resource-level permissions** – For “can edit this work order only”, add checks beyond module permission (e.g. assignee or same company).
- **RLS** – Supabase RLS policies can be added to enforce the same tenant/company and role rules at the database layer for direct client access.
