# Admin Architecture

This document describes the platform admin and tenant admin areas, access control, and how they fit into Cornerstone OS.

## Overview

- **Platform super admins** (software owners) manage the entire platform: tenants, usage, and can impersonate any non–super-admin user.
- **Tenant admins** (owners and admins of a tenant) manage their organization: company info, users, roles, and notifications, and can impersonate users within their tenant only.

## Platform Admin Area

**Route:** `/platform`

Only users listed in the `platform_super_admins` table can access this area. The layout redirects non–super-admins to `/dashboard`.

### What platform admins can do

- View **Tenants** list and open **Tenant detail** (`/platform/tenants`, `/platform/tenants/[id]`).
- See tenant name, slug, companies, and a list of **tenant users**.
- **Impersonate** any user in a tenant (except other platform super admins) via an "Impersonate" button next to each user. Starting impersonation sets a cookie and redirects to `/dashboard` as that user.
- View high-level usage (e.g. tenant/company counts, work orders, users) on the platform home.

### Visibility

- Platform tools are **not** shown in the main app navigation (Command Center, Work Orders, Dispatch, etc.).
- A "Platform Admin" link is shown in the sidebar only when the **real** authenticated user is a platform super admin (so it appears even when impersonating a non–admin, and disappears when viewing as an impersonated user who is not a super admin).
- The `/platform` tree is protected by the same auth middleware as the rest of the app; the layout performs an additional server-side check and redirects if the user is not a platform super admin.

## Tenant Admin Settings Area

**Route:** `/settings` (and sub-routes)

Only tenant **owners** and **admins** can access Settings. The settings layout checks the **real** user’s membership role (not the effective/impersonated user) so that only the actual admin can manage the organization.

### Settings navigation

- **Company** — Organization (tenant) name/slug and list of companies in the tenant.
- **Users** — List of tenant members with role; **Impersonate** for owners/admins (except platform super admins).
- **Roles & Permissions** — Read-only view of built-in roles (owner, admin, member, viewer) and their descriptions. No custom role builder.
- **Notifications** — Current user’s notification preferences (and future tenant-wide defaults).

### Built-in roles

- **owner** — Full control of the organization (e.g. billing, deletion).
- **admin** — Manage users, roles, and settings; can impersonate users in the tenant.
- **member** — Standard access (work orders, assets, operations).
- **viewer** — Read-only access.

Tenant admins assign these roles when inviting or editing users. Permissions are evaluated from the **effective** user (the impersonated user when impersonation is active, otherwise the authenticated user).

## Main App Navigation

The main app navigation (sidebar) includes:

- Command Center / Dashboard, Operations, Companies, Properties, Buildings, Units
- Work Orders, Work Requests, Request Portal, Assets, Asset Intelligence, Technicians, Crews, Dispatch, Preventive Maintenance, Reports
- Customers, Vendors, Products, Inventory, Purchase Orders
- Contracts, Invoices
- **Settings** (single entry under Organization)

Platform-only routes (`/platform`, `/platform/tenants`, etc.) do **not** appear in this list; they are reached via the "Platform Admin" link when the current **real** user is a platform super admin.

## Security and Isolation

- **Tenant isolation** — All tenant-scoped data is filtered by the effective user’s tenant (from `tenant_memberships`). Platform super admins bypass tenant filters only where explicitly allowed (e.g. platform admin pages).
- **Settings access** — Gated by the **real** user’s role (owner/admin). Impersonating a viewer does not grant settings access.
- **Platform access** — Gated by the **real** user’s presence in `platform_super_admins`. Impersonation does not grant platform access unless the real user is already a super admin.

## Related Documentation

- [Impersonation system](./impersonation-system.md) — Session model, banner, return flow, and audit logging.
- [Multi-tenant architecture](./multi-tenant-architecture.md) — Tenants, companies, and membership.
- [Permissions model](./permissions-model.md) — How roles and permissions are evaluated.
