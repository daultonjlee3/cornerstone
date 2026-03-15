# Multi-tenant demo seed

Seeds four demo tenants with realistic data for:

1. **Summit Facility Services** (facility maintenance)
2. **Northstar Industrial Manufacturing** (manufacturing)
3. **Riverside Unified School District** (school district)
4. **Mercy Regional Medical Center** (healthcare)

## Prerequisites

- `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `PEXELS_API_KEY` for category-level asset images
- Migrations applied (`supabase db push` or equivalent)

## Run

From project root:

```bash
npm run seed:demo
```

Or:

```bash
npx tsx scripts/seed-demo/run.ts
```

## Behavior

- **Idempotent**: If a tenant with the same slug and company name already exists, that tenant is skipped (no duplicate data).
- **One Pexels image per asset type** per run; images are reused across all assets of that type.
- Work order and PM dates are relative to **today** (overdue, due today, this week, completed recently) so demos feel current when reseeded; work request and activity log timestamps are spread over the past weeks/months so history feels real.
- No auth users are created; use Supabase Dashboard or your auth flow to create demo users and link them to tenants via `tenant_memberships`.

## Demo user accounts (optional)

To allow self-serve demo login, create users in Supabase Auth and then:

1. Insert into `public.users` (or rely on the `handle_new_auth_user` trigger).
2. Insert into `public.tenant_memberships` (tenant_id, user_id, role e.g. 'admin').
3. Optionally insert into `public.company_memberships` (company_id, user_id, role).

Example emails you could create and document:

- facility-demo@cornerstonecmms.com → Summit Facility Services (tenant slug: summit-facility-demo)
- manufacturing-demo@cornerstonecmms.com → Northstar (slug: northstar-manufacturing-demo)
- school-demo@cornerstonecmms.com → Riverside (slug: riverside-schools-demo)
- healthcare-demo@cornerstonecmms.com → Mercy (slug: mercy-healthcare-demo)

## Counts (per tenant, approximate)

- 5 properties, 10–15 buildings, multiple units
- 7–9 technicians
- 8–9 vendors
- 15–20 products, inventory balances at Main Warehouse
- 80–150+ assets (by pattern), plus sub-assets
- 25 PM plans, 30+ PM templates
- 72 work orders (mixed status, backdated)
- 15 work requests
- 6 purchase orders
- Activity logs for work orders and assets

## Demo quality & audit

The seed is designed to be **sales-ready** and **QA-useful**: key visible fields are filled so demos rarely show empty columns or “—” in the UI.

- **Companies**: legal_name, company_code, primary_contact_name, primary_contact_email
- **Properties**: address_line1, city, state, zip
- **Buildings**: year_built, floors, square_feet, notes where applicable
- **Assets**: manufacturer, model, serial_number, install_date, condition, criticality, description; linked to property/building/unit
- **Work orders**: property_id, building_id (from asset); requesters varied; completion_notes/resolution_summary/completed_by for completed; status mix includes open, assigned, in_progress, on_hold, completed
- **PM templates**: description, instructions, estimated_duration_minutes
- **PM plans**: description, instructions, assigned_technician_id, location from asset, estimated_duration_minutes
- **Vendors**: contact_name, email, phone, service_type; optional website
- **Products/inventory**: default_vendor_id, default_cost, reorder_point_default; balances with quantity_on_hand, minimum_stock, reorder_point
- **Purchase orders**: expected_delivery_date, total_cost; lines with product_id, quantity, unit_price, line_total
- **Work requests**: some linked to asset_id; location text (property_id/building_id not in schema)

See **[DEMO_IMPROVEMENTS.md](./DEMO_IMPROVEMENTS.md)** for a summary of improvements per demo company, date logic, and schema/UI gaps.

After seeding, a **post-seed validation summary** reports counts of important blank fields by entity so you can quickly spot demo quality issues. Run `npm run seed:demo` and check the “Demo seed validation” section at the end of the output.
