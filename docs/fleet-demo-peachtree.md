# Peachtree Industrial Services — Fleet Intelligence Demo

Production-quality demonstration tenant for enterprise fleet sales demos.

## Company profile

| Field | Value |
|-------|-------|
| Tenant slug | `peachtree-industrial` |
| Company | Peachtree Industrial Services |
| HQ | Marietta, Georgia |
| Fleet | 38 trucks across 3 branches |
| Branches | Marietta HQ (94% util), Gainesville (73%), Macon (61%) |
| Jobs | ~220 (150 completed, 25 in-progress, 18 scheduled today, 6 unassigned, etc.) |
| Geography | Metro Atlanta + North Georgia customer sites |

## Prerequisites

1. `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Fleet migrations applied (including `20260624190000_fleet_demo_reset_fn.sql`)

```bash
supabase db push
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run seed:fleet-demo` | Full seed + mart refresh + recommendations + validation |
| `npm run seed:fleet-demo:reset` | Clear Peachtree fleet data (keeps tenant & company) |
| `npm run seed:fleet-demo:refresh` | Reset then full seed |
| `npm run seed:fleet-demo:marts` | Refresh 45-day utilization marts only |
| `npm run seed:fleet-demo:recommend` | Regenerate recommendations only |
| `npm run seed:fleet-demo:validate` | Run validation checklist |

## Demo login

1. Create or assign a user to tenant slug **`peachtree-industrial`**
2. Ensure `product_profile = fleet_intelligence` on the tenant (set automatically by seed)
3. Log in and open **Fleet Command Center** (`/operations`)

## Validation checklist

After seeding, `npm run seed:fleet-demo:validate` verifies:

- [ ] 38 trucks seeded
- [ ] 30+ customer sites across Metro Atlanta / North Georgia
- [ ] 200+ jobs with 150+ completed history
- [ ] 6+ unassigned jobs (urgent mix for recommendations)
- [ ] Telematics events (online, stale, offline trucks)
- [ ] Utilization marts populated (45-day backfill)
- [ ] **Fleet Command Center** — KPIs, briefing, exceptions, deltas
- [ ] **Dispatch Intelligence** — truck lanes + unassigned queue
- [ ] **Recommendations** — truck assignment, capacity, idle match
- [ ] **Exceptions** — unassigned urgent, over-capacity, stale GPS, integration issues
- [ ] **Executive briefing** — rules-based morning summary (no AI)
- [ ] **Changes since yesterday** — utilization, revenue/truck, idle hours deltas
- [ ] **Integration health** — active + stale/error connection for demo

## 30-second demo narrative

1. **Fleet Command Center** — Read the executive briefing; point out Marietta at capacity vs Gainesville idle trucks
2. **Exceptions** — Show urgent unassigned jobs and stale GPS / integration warnings
3. **Recommendations** — Explain truck assignment with confidence, alternatives, and impact
4. **Dispatch Intelligence** — Live board with truck lanes, unassigned queue, branch utilization
5. **Fleet Performance / Reports** — MTD revenue per truck, utilization trends, deadhead

## Reset behavior

Reset uses `reset_fleet_demo_tenant()` RPC to safely clear append-only telematics data, then re-seeds fresh operational state. Tenant and company records are preserved.
