# Multi-Tenant Architecture

## Overview

Cornerstone OS uses a **tenant → company** hierarchy. Operational data is scoped by **company**; users access companies through **tenant** membership.

## Core Tables

### Tenants

- **`public.tenants`** – Top-level workspace/account. One tenant can own multiple companies.
- Fields: `id`, `name`, `slug`, `created_at`, `updated_at`.

### Companies

- **`public.companies`** – Each company belongs to one tenant (`tenant_id`). This is the primary scope for properties, work orders, assets, etc.
- Fields include: `id`, `tenant_id`, `name`, `status`, `legal_name`, `company_code`, and contact info.

### Users

- **`public.users`** – Mirrors `auth.users` (same `id`). Used for profile and membership links.
- **`auth.users`** – Supabase Auth; sign-in and session.

### Membership

- **`tenant_memberships`** – Links users to tenants. One user can belong to multiple tenants.
  - Columns: `tenant_id`, `user_id`, `role` (`owner` | `admin` | `member` | `viewer`).
- **`company_memberships`** – (Optional) User ↔ company with role. Current flows use tenant membership and “first company in tenant” for default context.

## Scoped Tables (company_id and/or tenant_id)

All of the following are scoped so that access is restricted to the current user’s tenant/company:

| Table / area              | Scoping column(s) | Notes                          |
|---------------------------|-------------------|--------------------------------|
| properties                | company_id        |                                |
| buildings                 | property_id → company | some migrations add tenant_id |
| units                     | building_id / property_id |                      |
| customers                 | company_id        |                                |
| asset_categories          | company_id        |                                |
| technicians               | company_id        |                                |
| vendors                   | company_id        |                                |
| assets                    | company_id        |                                |
| work_orders               | company_id        |                                |
| crews                     | tenant_id, optional company_id |           |
| products                  | company_id        |                                |
| stock_locations           | company_id        |                                |
| inventory_balances       | via product/location → company |          |
| inventory_transactions   | company_id (where present) |              |
| purchase_orders           | company_id        |                                |
| activity_logs             | company_id, tenant_id |                      |
| notifications             | company_id        | Optional; user_id is recipient |
| preventive_maintenance_*  | company_id / tenant_id as per migrations | |

## Resolution (Server-Side)

Use the centralized helpers in **`src/lib/auth-context.ts`**:

- **`getCurrentUser()`** – Current authenticated user or null.
- **`getTenantIdForUser(supabase?)`** – Tenant ID for the current user (first membership).
- **`getCompanyIdsForUser(supabase?)`** – All company IDs the user can access (companies in their tenant).
- **`getDefaultCompanyIdForUser(supabase?)`** – First company ID (for single-company UX).
- **`getMembershipRoleForUser(supabase?)`** – Role in that tenant (`owner` | `admin` | `member` | `viewer`).
- **`isPlatformSuperAdmin(supabase?)`** – True if user is in `platform_super_admins`.
- **`companyBelongsToTenant(companyId, tenantId, supabase?)`** – Check company is in tenant.
- **`canAccessCompany(companyId, supabase?)`** – True if super admin or company in user’s tenant.
- **`getAuthContext(supabase?)`** – Full context (user, tenantId, companyIds, role, isPlatformSuperAdmin); throws if not authenticated or no tenant.

Do not duplicate tenant/company resolution logic across modules; call these helpers from Server Actions, route handlers, and loaders.

## Platform Super Admins

- **`public.platform_super_admins`** – Table with `user_id` (FK to `users.id`). If a user is in this table, they are treated as platform super admins.
- Super admins can access **all** tenants/companies and the **Platform Admin** UI at `/platform`.
- Add/remove super admins by inserting/deleting rows in `platform_super_admins`.

## Migration Assumptions

- Existing data was backfilled so every company has a `tenant_id` (one tenant per company when no multi-tenant existed).
- New tenants are created in onboarding; companies are linked to that tenant.
- Enforcing “user can only see data for their tenant” is done in server-side code (and optionally RLS); all data access should go through scoped queries using `company_id` / `tenant_id` derived from the helpers above.

## Future Extension

- Multiple companies per tenant: already supported; `getCompanyIdsForUser` returns all. UI can add company switcher.
- Custom tenant-level settings: add `tenant_settings` or use `companies` for company-level settings.
- RLS: policies can be added to mirror the same tenant/company rules for direct Supabase client access if needed.
