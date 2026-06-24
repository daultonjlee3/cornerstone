# Sprint 3 — Utilization Mart + Three Sellable Screens

**Goal:** Pilot buyer sees fleet KPIs and dispatch board populated from fleet marts.

**Depends on:** [sprint-2-telematics-and-job-ingest.md](sprint-2-telematics-and-job-ingest.md)

## Database

| Table | Purpose |
|-------|---------|
| `utilization_daily` | truck_id, branch_id, date, billable/idle/total hours, miles, revenue, deadhead_miles, committed_hours |
| `branch_capacity_snapshots` | branch_id, date, available_truck_hours, committed_hours |

Migration: `supabase/migrations/20260420100000_fleet_utilization_marts.sql`

## Mart refresh

- `src/lib/fleet/marts/refresh-utilization-daily.ts` — aggregates telematics + jobs, upserts marts
- `src/lib/fleet/marts/deadhead.ts` — Haversine deadhead (labeled estimated in UI)
- `POST /api/cron/fleet/refresh-marts` — nightly cron (Vercel 02:00 UTC)
- Post-ingest hook in `src/lib/integrations/ingest/pipeline.ts`

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/fleet/command-center` | KPIs for Command Center |
| `GET /api/fleet/dispatch-board` | Jobs, truck lanes, capacity |
| `GET /api/fleet/utilization` | Truck × day aggregates |
| `GET /api/fleet/utilization/export` | CSV export |

## UI screens

| Screen | Route | Components |
|--------|-------|------------|
| Fleet Command Center | `/operations` | `fleet-command-center-section.tsx`, `fleet-recommendations-placeholder.tsx` |
| Dispatch Intelligence Board | `/dispatch` | `FleetDispatchView`, map, truck lanes, capacity panel |
| Utilization & Revenue Report | `/reports/operations` | `fleet-utilization-report.tsx` |

**Data rule:** Screens read `utilization_daily` + mart queries only (not raw `telematics_events` in UI).

## Nav gating

`nav-config.ts` — `fleet_intelligence` profile: primary nav = Command Center, Dispatch, Utilization, Integrations; CMMS groups secondary.

## Success criteria

- [ ] Fleet tenant sees 3 screens with mart data after refresh
- [ ] Utilization report shows ≥7 days history per truck after backfill
- [ ] Revenue/truck MTD non-zero when jobs have revenue
- [ ] Dispatch map shows truck + job pins; deadhead labeled "estimated"
- [ ] CMMS modules de-emphasized for `fleet_intelligence`
- [ ] 30-second morning briefing works without spreadsheet

## Tests

```bash
npx vitest run tests/sprint-3-fleet-marts.test.ts
npx vitest run tests/sprint-3-fleet-apis.test.ts
```

## Deferred to Sprint 4

- Recommendation engine (`recommendation_instances`, accept/dismiss)
- QuickBooks / Fleetio integrations
