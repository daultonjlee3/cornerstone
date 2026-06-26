# Peachtree Industrial — Golden Demo Environment

Resettable sales and marketing demo tenant for **Peachtree Industrial Services**, a fictional 20+ year Georgia industrial services operator using Cornerstone Fleet Intelligence daily.

**Tenant slug:** `peachtree-industrial`  
**Product profile:** `fleet_intelligence`  
**Demo board date:** tomorrow (UTC+1 day) — use `?date=YYYY-MM-DD` on Dispatch

---

## Demo storyline

Peachtree Industrial Services runs hydrovac, vacuum, industrial cleaning, and plant shutdown work across five Georgia branches. The company has been operating since 2003 with mature fleet telematics, maintenance workflows, and dispatch discipline.

**Tomorrow’s operation** (primary demo day) is a full Tuesday dispatch: 38 scheduled jobs, 6 unassigned high-priority work orders, Atlanta South over capacity, and AI recommendations ready for review.

**Staged scenarios for walkthroughs:**

| Scenario | Detail |
|----------|--------|
| 5 dispatch recommendations | Georgia Power daylighting, logistics yard vacuum, storm drain, plant shutdown, emergency response |
| 3 PM conflicts | PT-1031 (in maintenance), PT-1018 & PT-1024 (PM due soon — never recommended) |
| 2 GPS stale | PT-1015, PT-1029 |
| 1 GPS offline | PT-1036 |
| Branch capacity | Atlanta South >100% utilization |
| Revenue at risk | $31,000+ from unassigned demo-day jobs |
| Integrations | Samsara + Fleetio + QuickBooks (read-only) connected; Dispatch Webhook warning |

**Today** shows live operations: trucks working, en-route context, completed history, and 90 days of analytics for mature charts.

---

## Safety guardrails

The seed **only** touches tenant slug `peachtree-industrial`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DEMO_SEED_ENABLED=true` | Yes | Master kill switch |
| `FORCE_DEMO_SEED=true` | Remote Supabase only | Allows seed against non-local projects |
| `SUPABASE_DEMO_PROJECT` | Optional | Marks project as demo-safe |

Refuses to run without `DEMO_SEED_ENABLED`. Refuses remote production unless `FORCE_DEMO_SEED=true`.

---

## How to run

```bash
# Add to .env.local
DEMO_SEED_ENABLED=true
# For remote Supabase (optional):
# FORCE_DEMO_SEED=true

# Full reset + seed + validate (recommended)
npm run seed:peachtree-demo

# Validate only
npm run seed:peachtree-demo:validate

# Other modes
npm run seed:fleet-demo:reset
npm run seed:fleet-demo:marts
npm run seed:fleet-demo:recommend
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

Apply migrations before first run (including `20260626200000_fleet_demo_reset_extensions.sql`).

---

## What gets created

| Entity | Count | Notes |
|--------|------:|-------|
| Branches | 5 | Atlanta North, Atlanta South, Macon, Savannah, Augusta |
| Trucks | 42 | PT-1001 … PT-1042 |
| Operators | 55 | Branch-assigned, certifications, 5 on PTO demo day |
| Customers / sites | 32 each | Realistic GA industrial locations |
| Jobs | ~370+ | 90-day history + today live + tomorrow demo day + day+2 |
| Telematics events | ~336 | Per-truck trip history; staged GPS profiles |
| Utilization mart | 90 days | Revenue, contribution, deadhead, utilization |
| Integrations | 6 | Samsara, Fleetio, QuickBooks, CSV, telematics webhook, jobs webhook (error) |
| Recommendations | 5+ | Generated for tomorrow’s board |

---

## Demo walkthrough

1. **Command Center / Operations** — AI briefing, exceptions, integration health, metric deltas.
2. **Dispatch Workspace** — Open `/dispatch?date=<tomorrow>`. Map shows jobs across Atlanta metro, Macon, Savannah, Augusta. Review 6 unassigned jobs and 5+ recommendations.
3. **Accept a recommendation** — PT-1004 → Georgia Power daylighting (example; actual truck varies by engine).
4. **Fleet map** — Today’s in-progress jobs, idle trucks, GPS offline/stale exceptions.
5. **Analytics** — 90-day utilization, deadhead, contribution, branch performance.
6. **Integrations** — Settings → verify Samsara/Fleetio/QuickBooks; note webhook warning.

**Sample briefing copy (tomorrow’s board):**

> Good morning. I analyzed tomorrow’s operation for Peachtree Industrial Services. 5 dispatch decisions require review. Estimated contribution opportunity is +$16,400, with a projected 14% deadhead reduction. One branch is capacity-constrained and three trucks need operational attention.

---

## Screenshots to capture

| Screen | URL / focus | Why |
|--------|-------------|-----|
| Dispatch map (dark) | `/dispatch?date=<tomorrow>` | Full metro map, unassigned queue, truck lanes |
| Recommendation card | Dispatch → Recommendations panel | Explainability, confidence, alternatives |
| Command Center | `/operations` | Executive briefing + exceptions |
| Fleet live map | `/fleet` or operations map | Working + en-route trucks |
| Analytics utilization | Fleet analytics | 90-day mature charts |
| Branch capacity | Dispatch branch strip | Atlanta South overload |
| Integrations | `/settings/integrations` | Connected ecosystem + webhook warning |
| Truck detail | PT-1031 maintenance | PM conflict scenario |

---

## Known staged units

| Unit | Role |
|------|------|
| PT-1004, PT-1012, PT-1028, PT-1007, PT-1019 | Strong recommendation candidates |
| PT-1031 | In maintenance — blocked |
| PT-1018, PT-1024 | PM due soon — blocked |
| PT-1036 | GPS offline — blocked |
| PT-1015, PT-1029 | GPS stale — deprioritized |

---

## Login

Assign any demo user to tenant `peachtree-industrial` via super-admin or `npm run seed:demo:users` if configured.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `reset_fleet_demo_tenant` not found | Run `supabase db push` or apply fleet demo migrations |
| Seed refused | Set `DEMO_SEED_ENABLED=true` |
| Remote refused | Set `FORCE_DEMO_SEED=true` |
| Validation fails on recommendations | Re-run `npm run seed:fleet-demo:recommend` |
| Wrong dispatch date | Use tomorrow’s date in URL (printed after seed) |
