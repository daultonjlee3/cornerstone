# Schema Revision: Tenant vs Company, Crews, Unit Flexibility

## 1. Tenant vs Company

**Correction:** A tenant is not the same as a company. One tenant (account/workspace) can own multiple companies.

- **tenant** = top-level billing/account/workspace (e.g. "Acme Corp" the organization).
- **company** = operating entity under that tenant (e.g. "Acme Property Management", "Acme HVAC").

**Design:**

- **tenants** table: true top-level. Fields: id, name, slug?, created_at, updated_at.
- **tenant_memberships**: links users to tenants (user_id, tenant_id, role). Answers "which tenants can this user access?"
- **companies**: add **tenant_id** NOT NULL. Each company belongs to exactly one tenant. Hierarchy: **tenant → companies → properties → buildings → units**.

**company_memberships — keep or defer for MVP?**

- **Keep (recommended):** Use for company-level permissions. A user in tenant T can be restricted to specific companies (C1, C2) via company_memberships, with roles per company. Supports "this user only sees Company A within the tenant."
- **Defer for MVP:** Use only tenant_memberships; everyone in a tenant sees all companies. Simpler, but no per-company roles later without a new migration.

**Recommendation:** Keep **company_memberships**. It is already in the schema and supports per-company roles and scoped access. For MVP you can still treat "user in tenant" as "access all companies in tenant" in app logic.

---

## 2. Unit flexibility (not required to belong to a building)

**Requirement:** Units can exist without a building and can link directly to a property.

**FK design:**

- **units.building_id**: nullable (already). When set, unit is in that building (property is implied by building).
- **units.property_id**: nullable, **added**. When unit is not in a building, set property_id so the unit is "directly under" a property.
- **CHECK (building_id IS NOT NULL OR property_id IS NOT NULL):** Every unit must have at least one of building or property.

We do **not** enforce "when building_id is set, property_id must equal building.property_id" in the DB (would require a trigger). The app can keep them in sync if desired.

**Indexes:** Keep partial index on `building_id`. Add partial index on `property_id` for joins and RLS.

**Backfill:** Existing units with `building_id` NULL have no property today. Before adding the CHECK we backfill: set `property_id` from the building’s property for units that have a building. For units that already have `building_id` NULL, the migration uses **CHECK ... NOT VALID** so it does not fail; you must backfill those rows with a chosen `property_id` and then run `VALIDATE CONSTRAINT` (or run a one-off data fix before applying the migration if the table is small).

---

## 3. Crew support

**Requirements:**

- Crews are tenant-level and **not** required to belong to a company (same flexibility idea as units).
- Work orders can be assigned to crews in addition to individual technicians.

**Design:**

- **crews**: **tenant_id** NOT NULL, **company_id** nullable. Name, description?, is_active?, timestamps. When company_id is NULL, crew is tenant-level and can be used across companies in that tenant.
- **crew_members**: crew_id, technician_id (many-to-many). Technicians stay company-scoped; crews can list technicians (same or different companies if crew is tenant-level—enforcement in app if needed).
- **work_order_crews**: work_order_id, crew_id (many-to-many). Work orders can have multiple crews; crews can be on multiple work orders.
- **technician_assignments** unchanged: work orders can still be assigned to individual technicians.

**Indexes:** FKs indexed on crews (tenant_id, company_id), crew_members (crew_id, technician_id), work_order_crews (work_order_id, crew_id).

---

## 4. Migration strategy

- Additive only: new tables and ALTERs, no drop/recreate.
- **companies.tenant_id:** Add nullable, backfill one tenant per existing company, set NOT NULL, add FK.
- **units:** Add property_id, backfill from building where possible, add FK and index, add CHECK (with NOT VALID if we need to allow existing orphan units until backfilled).
- New tables: tenants, tenant_memberships, crews, crew_members, work_order_crews.
