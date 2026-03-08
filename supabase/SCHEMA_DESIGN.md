# Cornerstone Database Schema Design

## Design Decisions

### 1. Multi-tenancy (revised: tenant vs company)
- **tenants** is the true top-level account/workspace. One tenant can own **multiple companies**.
- **tenant_memberships** links users to tenants. **companies** has `tenant_id` (required).
- **company_memberships** remains for company-level permissions (which companies a user can access within a tenant and with what role). See **SCHEMA_REVISION_TENANT_CREW_UNITS.md** for full rationale.
- Row-Level Security (RLS) should scope by tenant (and optionally by company). This doc describes schema only; RLS is separate.

### 2. Location hierarchy (revised)
- **Tenant → Companies → Properties → Buildings → Units**.
- **properties** belong to a company.
- **buildings** belong to a property.
- **units** may belong to a **building** and/or directly to a **property**; `building_id` and `property_id` are nullable, with a CHECK that at least one is set. So units are not required to belong to a building.
- Assets, customers, work orders, and contracts can link at property, building, and/or unit level as appropriate.

### 3. Primary keys and timestamps
- All tables use **UUID** primary keys with `DEFAULT gen_random_uuid()`.
- Every table has **created_at** and **updated_at** (timestamptz, default `now()`).
- A single trigger function **set_updated_at()** updates `updated_at` on row change; applied to all tables.

### 4. Naming and conventions
- **snake_case** for all identifiers (tables, columns, indexes).
- Foreign key columns: `referenced_table_singular_id` (e.g. `company_id`, `building_id`).
- Indexes: `idx_<table>_<column(s)>` for general use; unique constraints named `uq_<table>_<columns>`.

### 5. Foreign key delete behavior
- **ON DELETE CASCADE**: Strong ownership (e.g. company → properties, property → buildings, building → units, work_order → work_order_tasks). Deleting the parent removes children.
- **ON DELETE SET NULL**: Optional references (e.g. work_order.customer_id, asset.building_id). When the referenced row is deleted, the FK is set to NULL.
- **ON DELETE RESTRICT**: Where deletion must be prevented if dependencies exist (e.g. prevent deleting a customer that has open invoices). Used sparingly; CASCADE/SET NULL preferred for predictable cleanup.
- **users** table: **ON DELETE CASCADE** from `auth.users` so when a user is removed from Auth, their profile and memberships are removed.

### 6. Indexes
- Index on **every foreign key** to speed up joins and RLS checks.
- Additional indexes on **status**, **company_id**, and common filter columns (e.g. `work_orders.status`, `invoices.due_date`).
- Unique constraints where needed (e.g. `invoice_number` per company, `(work_order_id, technician_id)` for assignments).

### 7. Status and enums
- Status columns use **TEXT** with **CHECK** constraints (or PostgreSQL **ENUM** types) for clarity and future flexibility. This migration uses **TEXT + CHECK** for simplicity and easy extension.
- Where applicable: draft, active/sent, completed/paid, cancelled/expired, etc.

### 8. Supabase compatibility
- No schema name prefix; tables live in **public**.
- **auth.users** is referenced only by **public.users.id**; no direct FKs from other tables to `auth.users`. All user linkage goes through **users** and **company_memberships**.
- Migration is idempotent-friendly (no `CREATE TABLE IF NOT EXISTS`; run once). Use Supabase migration history for repeat runs.

### 9. Tables not created by this migration
- **auth.users**: Provided by Supabase Auth. The **users** table in public extends it with app-specific profile data and is the target of **company_memberships.user_id**.

### 10. Relationship summary
| Table | Key relationships |
|-------|-------------------|
| tenants | Top-level account/workspace |
| users | id → auth.users(id) |
| tenant_memberships | user_id → users, tenant_id → tenants |
| companies | tenant_id → tenants |
| company_memberships | user_id → users, company_id → companies (company-level access) |
| properties | company_id → companies |
| buildings | property_id → properties |
| units | building_id → buildings (nullable), property_id → properties (nullable); CHECK at least one set |
| crews | tenant_id → tenants, company_id → companies (nullable) |
| crew_members | crew_id → crews, technician_id → technicians |
| work_order_crews | work_order_id → work_orders, crew_id → crews |
| customers | company_id; optional property_id, building_id, unit_id |
| customer_contacts | customer_id → customers |
| asset_categories | company_id → companies |
| assets | company_id; optional property_id, building_id, unit_id, asset_category_id |
| technicians | company_id → companies |
| vendors | company_id → companies |
| work_orders | company_id; optional property, building, unit, customer, asset, vendor; status, priority |
| work_order_tasks | work_order_id → work_orders |
| work_order_notes | work_order_id → work_orders |
| technician_assignments | work_order_id, technician_id (many-to-many) |
| contracts | company_id, customer_id; optional vendor_id, property, building, unit, asset |
| invoices | company_id; optional customer_id, work_order_id, contract_id |
| invoice_line_items | invoice_id → invoices |
| inventory_items | company_id; optional vendor_id |
| inventory_transactions | inventory_item_id → inventory_items |
| purchase_orders | company_id, vendor_id |
| purchase_order_lines | purchase_order_id → purchase_orders |
| pm_plans | asset_id → assets |
| pm_schedule_rules | pm_plan_id → pm_plans |
