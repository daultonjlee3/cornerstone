# Sprint 1 Fleet — Tenant Isolation Manual Test Checklist

Use two tenants (**Tenant A**, **Tenant B**), each with at least one user who has `fleet.manage`. Record tenant IDs and a sample row ID from each table before testing.

**Pass criteria:** Tenant A never sees or mutates Tenant B data unless logged in as platform super admin.

---

## Setup

- [ ] Migration `20260331100000_fleet_foundation.sql` applied
- [ ] Tenant A and Tenant B both have `product_profile = fleet_intelligence` (platform admin)
- [ ] Each tenant has: ≥1 branch, site, truck, operator, job, and a `csv_manual` integration connection (via CSV import or UI)
- [ ] Note IDs: `tenant_a_id`, `tenant_b_id`, plus one `branch_id`, `customer_site_id`, `truck_id`, `fleet_job_id`, `connection_id` per tenant

---

## Browser — read isolation

Log in as **Tenant A user**. Repeat key checks as **Tenant B user**.

| # | Step | Expected |
|---|------|----------|
| 1 | Open `/branches`, `/fleet/sites`, `/fleet/trucks`, `/fleet/jobs`, `/fleet/operators` | Only Tenant A rows |
| 2 | Open `/settings/integrations` | Only Tenant A connections and sync runs |
| 3 | Log out → log in as Tenant B → same pages | Only Tenant B rows; no overlap with A |

---

## Browser — write isolation (Tenant A session)

| # | Step | Expected |
|---|------|----------|
| 4 | Create a branch on `/branches` | Row appears with Tenant A scope only |
| 5 | Edit/delete a Tenant A fleet entity | Succeeds |
| 6 | Import fleet CSV on `/onboarding-wizard` | Rows land in Tenant A; sync run visible under Integrations |
| 7 | Call integration API (DevTools → Network): `GET /api/integrations/connections` and `GET /api/integrations/sync-runs` | JSON contains only Tenant A `tenant_id` values |

---

## Browser — permission gates (optional)

| # | Step | Expected |
|---|------|----------|
| 8 | As a user **without** `fleet.view`, open `/fleet/trucks` | Redirect or forbidden (once gated) |
| 9 | As a user **without** `fleet.manage`, trigger a fleet save/import | Error / permission denied |

---

## Supabase SQL editor — RLS (user JWT)

Run as **Tenant A user** via Supabase SQL editor authenticated as that user (or use client with user session). Replace UUIDs with your test IDs.

### SELECT blocked across tenants

```sql
-- Should return 0 rows (Tenant B ID while authenticated as Tenant A)
SELECT id, name FROM branches WHERE tenant_id = '<tenant_b_id>';
SELECT id, title FROM fleet_jobs WHERE tenant_id = '<tenant_b_id>';
SELECT id, provider FROM integration_connections WHERE tenant_id = '<tenant_b_id>';
SELECT id, status FROM integration_sync_runs WHERE tenant_id = '<tenant_b_id>';
```

- [ ] All cross-tenant SELECTs return **0 rows**

### INSERT blocked with wrong tenant_id

```sql
-- Should FAIL (RLS WITH CHECK)
INSERT INTO branches (company_id, tenant_id, name)
VALUES ('<tenant_a_company_id>', '<tenant_b_id>', 'RLS probe branch');
```

- [ ] Insert rejected

### UPDATE / DELETE blocked on other tenant's rows

```sql
-- Should affect 0 rows (or fail), using Tenant B branch ID while auth as Tenant A
UPDATE branches SET name = 'hacked' WHERE id = '<tenant_b_branch_id>';
DELETE FROM fleet_jobs WHERE id = '<tenant_b_job_id>';
```

- [ ] No rows updated or deleted

---

## Supabase SQL editor — cross-FK probes (after cross-ref guards migration)

Authenticated as **Tenant A**, attempt to link Tenant A job to Tenant B site:

```sql
-- Should FAIL (trigger or RLS), using known cross-tenant site ID
UPDATE fleet_jobs
SET customer_site_id = '<tenant_b_site_id>'
WHERE id = '<tenant_a_job_id>';
```

- [ ] Update rejected or affects 0 rows

---

## Integration API — cross-tenant connection (browser or curl)

As **Tenant A** (session cookie or Bearer token):

```http
POST /api/integrations/sync-runs
Content-Type: application/json

{"action":"start","connection_id":"<tenant_b_connection_id>"}
```

- [ ] Returns error / no run created for Tenant B

---

## Platform super admin (document only)

- [ ] Super admin **without** acting-tenant cookie: note behavior (may see all tenants via RLS bypass — intentional)
- [ ] Super admin **with** acting-tenant cookie set to Tenant A: fleet pages and APIs scoped to Tenant A

---

## Sign-off

| Area | Pass? | Notes |
|------|-------|-------|
| Browser read isolation | | |
| Browser write / CSV import | | |
| Integration APIs | | |
| SQL SELECT cross-tenant | | |
| SQL INSERT/UPDATE/DELETE cross-tenant | | |
| Cross-FK job → site | | |

**Tester:** _______________ **Date:** _______________
