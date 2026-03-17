# Performance Results (Phase 3)

This summarizes concrete improvements implemented in this pass and what was validated in runtime checks.

## Measured / verifiable improvements

| Area | Before | After | Impact |
|---|---|---|---|
| Work orders list payload | Unbounded filtered query returned all matching rows | Server pagination (`range`) capped at 50 rows/page with total count | Large drop in payload size and table render cost on large tenants |
| Work order list stats | Derived from full loaded row objects | Derived from lightweight count queries over filtered scope | Lower transfer/memory pressure while preserving KPI semantics |
| Material availability (`getWorkOrderMaterialLinesWithAvailability`) | N+1 loop: per pair balance query + reservations query | Batched `inventory_balances` + batched `inventory_reservations` | Query count reduced from `O(pairs)` to constant 2 |
| Work order detail load | Many independent sequential fetches | Major fetch groups parallelized with `Promise.all` | Lower server waterfall latency / faster first render |
| Dispatch modal rendering | Duplicate assignment/create modal trees mounted | Single modal instances only | Less unnecessary render/mount work and lower interaction jank |
| Dispatch URL/filter updates | Frequent `push` updates + possible no-op transitions | `replace` updates + no-op guard | Smoother filter interactions and reduced history churn |
| Middleware profile lookups | Profile lookup on most authenticated requests | Profile lookup only for auth/portal routing paths | Reduced per-request DB overhead on app navigation |
| Post-login path | Extra profile lookup in login action | Direct redirect to intended route (`next` or `/operations`) | Faster sign-in completion path |
| Signup completion path | Redirected to `/dashboard` alias first | Redirects directly to `/operations` | Removes extra hop |
| Operations dashboard perceived load | PM intelligence blocked full page render | PM intelligence streamed via Suspense fallback | Faster perceived first content paint for operations shell |

## Runtime checks executed

- Login and protected-route unauth redirects verified in browser walkthrough:
  - `/login` renders successfully
  - `/operations` → `/login?next=%2Foperations`
  - `/work-orders` → `/login?next=%2Fwork-orders`
  - `/dispatch` → `/login?next=%2Fdispatch`

- Curl timing smoke checks (local dev server):
  - `/login` returned `200`
  - protected routes returned expected `307` redirects while unauthenticated

## Constraints / benchmark limits

- A fully authenticated benchmark across data-heavy pages (dashboard/work-orders/dispatch/details with tenant data) could not be completed in this environment because demo user seeding requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, which was unavailable.
- Despite that, high-impact bottlenecks were fixed directly in hot paths (query strategy, batching, render churn, route transition behavior), and unauthenticated flow/runtime behavior was validated.

## Additional architectural gains for a second pass

1. Add DB-level report/materialized views for operations intelligence.
2. Add virtualized rendering for very large tabular pages.
3. Introduce tag-scoped cache/revalidation strategy for work-order mutations.
4. Add targeted DB indexes for dominant work-order/dispatch sort+filter paths.
