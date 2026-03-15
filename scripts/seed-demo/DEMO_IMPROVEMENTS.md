# Demo seed improvements (post-hardening)

Seeded data is designed to feel like **real organizations that have actively used the system for several months**: dates are relative to the current date, work orders and PM plans have a realistic status mix (overdue, due today, upcoming, completed), and activity/history are backdated so dashboards and feeds look populated.

## Per–demo-company improvements

### 1. Summit Facility Services (facility maintenance)

- **Company profile**: HQ address (Denver), phone, website set on `companies`.
- **Technicians**: First two have roles (Maintenance Manager, Lead Technician) in notes; all have contact email in notes.
- **Assets**: Market-appropriate manufacturers (Trane, Carrier, Lennox, Eaton, Otis, Edwards, Grundfos, etc.).
- **PM**: Added annual fire system inspection template; PM plans use dynamic `next_run_date` (overdue, today, next 7 days, 8–30 days).
- **Work orders**: Status mix and dates relative to today; completed WOs have completion notes and resolution summary; activity logs include `work_order_completed` with `performed_at` = completed_at.
- **Work requests**: Created_at spread over last ~2 months; varied location text (Main building, North wing, Mechanical room).

### 2. Northstar Industrial Manufacturing (industrial / manufacturing)

- **Company profile**: HQ address (Detroit), phone, website.
- **Technicians**: Maintenance Manager and Lead Technician roles; contact info in notes.
- **Assets**: Industrial manufacturers (Ingersoll Rand, Atlas Copco, Caterpillar, Cleaver-Brooks, BAC, Eaton, etc.).
- **PM**: Added annual cooling tower shutdown/cleaning template; weekly/monthly/quarterly/annual mix.
- Same work order, work request, and activity log behavior as Summit.

### 3. Riverside Unified School District (school district)

- **Company profile**: HQ address (Riverside, CA), phone, website.
- **Technicians**: Director of Facilities and Lead Technician; contact in notes.
- **Assets**: School-appropriate manufacturers (Trane, Weil-McLain, Notifier, Hobart, Generac, etc.).
- **PM**: Added annual playground and grounds safety inspection; existing monthly/quarterly fire alarm, generator, kitchen, boiler.
- Same work order, request, and activity behavior; work requests feel like staff-submitted tickets over the past months.

### 4. Mercy Regional Medical Center (healthcare facility)

- **Company profile**: HQ address (Cleveland), phone, website.
- **Technicians**: Facilities Manager and Lead Technician; contact in notes.
- **Assets**: Healthcare-appropriate manufacturers (Trane, Carrier, Johnson Controls, Otis, BAC, Steris-style "Other").
- **PM**: Added annual sterilization equipment certification; weekly generator, monthly AHU/CT, quarterly medical gas and elevator.
- Same work order, request, and activity behavior.

## Date logic

- **Work orders**: Due/scheduled/completed dates are relative to **today** (e.g. completed 1–7 days ago, in progress today, scheduled this week, overdue 1–5 days, new/ready_to_schedule with due dates in the next 7 days). Reseeding keeps demos current.
- **PM plans**: `next_run_date` is set so some are overdue, some due today, some in the next 7 days, some in 8–30 days.
- **Work requests**: `created_at` spread over the last ~2 months (3–60 days ago).
- **Activity logs**: `work_order_created` backdated 0–5 months; `work_order_completed` uses each completed WO's `completed_at`; `asset_updated` backdated 0–8 months.

## Schema / UI gaps (no changes made)

- **Companies**: No `description` column; only `address`, `phone`, `website` are set. Industry “description” would require a schema addition.
- **Work requests**: Table has `location` (text) and `asset_id` only; no `property_id` or `building_id`. Linking requests to properties/buildings would require schema/UI support.
- **Low-stock / reorder**: Inventory has `quantity_on_hand`, `minimum_stock`, `reorder_point`; seed sets them so some items can be at or below reorder for demo; no separate “low stock” flag in seed.
- **Map**: Properties and buildings get coordinates from seed; work orders inherit from property. If the app uses work-order-level lat/long, the trigger or app logic must propagate from property/building.
