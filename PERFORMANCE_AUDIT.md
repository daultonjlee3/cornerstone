# Performance Audit — Cornerstone OS

**Date:** 2025-03  
**Scope:** Full-stack performance across login, navigation, dashboard, work orders, dispatch, assets, lists, and API/data.

---

## Summary

The app uses Next.js App Router with Supabase. The authenticated layout already parallelizes 8 independent queries. Several high-impact improvements were identified: option-list overfetching on work orders, missing loading skeletons for operations, middleware/profile lookup on every request, and client-side re-renders on large lists. The audit below is ordered by **severity (critical → low)** and **impacted screens**.

---

## 1. Work orders page: overfetching option lists (assets, properties, buildings, units)

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Option lists | Fetches all assets, all properties, all buildings, all units for the tenant with no limit | Large tenants can have thousands of rows; each query blocks the server render; assets query already orders by name but no `.limit()` | **High** | Work orders list page | Add `.limit(500)` (or 300) to assets, and limits to properties/buildings/units where sensible. Keep pagination for work orders themselves. | Faster TTFB for work orders page; less memory and DB load. |

---

## 2. Operations (dashboard) has no route-level loading skeleton

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Navigation | Visiting `/operations` shows blank or layout-only until `loadOperationsDashboardData` + `loadOperationsIntelligenceData` finish | No `loading.tsx` for the operations route; user sees nothing until full data loads | **High** | Operations Center (landing) | Add `app/(authenticated)/operations/loading.tsx` with a skeleton matching the dashboard layout (header, KPI placeholders, cards). | Perceived speed: instant feedback on navigation; content streams in. |

---

## 3. Authenticated layout: sequential auth + optional profile lookup

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Layout | `getUser` → `getTenantId` → membership → then 8 queries in parallel; for non–portal users, `users.is_portal_only` and profile are still fetched every time | Two round-trips before the parallel batch; profile/tour data could be deferred for non-portal users | **Medium** | Every authenticated page | Already optimized with Promise.all for phase 3. Consider caching tenant membership in cookie/short TTL to avoid DB on every request (follow-up). No change in this pass. | — |

---

## 4. Middleware: `getUser()` on every matched request

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Auth | Middleware calls `supabase.auth.getUser()` for every protected/auth path | Adds ~50–200 ms per navigation depending on network | **Medium** | All route transitions | Necessary for correct auth. Could use Edge config or short-lived cookie to skip full getUser when a recent session is known (future). No change in this pass. | — |

---

## 5. Work orders: buildings/units fetched after first parallel batch

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Data loading | `buildings` depends on `propertyIds`; `units` depends on `buildingIds`; so they run after the first Promise.all | One extra round-trip (buildings then units) after the main option batch | **Medium** | Work orders page | Run buildings and units in parallel: `Promise.all([buildingsQuery, unitsQuery])` where units use a subquery or `in('building_id', buildingIds)` and buildingIds come from the same batch as properties (e.g. fetch buildings with property_id in propertyIds, then units with building_id in buildingIds from that result). Already structured that way; only minor tuning (e.g. ensure single round-trip for buildings+units). | Slightly faster work orders load. |

---

## 6. Dispatch: single large `loadDispatchData` payload

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Data loading | All work orders for the selected date/filters, all crews, all technicians, filter options, and insights loaded in one go | Large payload and multiple queries in one function; map and board wait for everything | **Medium** | Dispatch page | Already one server round-trip. Add `loading.tsx` (exists) and consider streaming or splitting: e.g. show board with work orders first, load map or secondary panels with dynamic import. Implemented: ensure loading skeleton is shown; lazy load map component. | Perceived speed; faster interactive board. |

---

## 7. Client components: large subtree re-renders (work orders list)

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Re-renders | `WorkOrdersList` is a single large client component; filter changes or state updates re-render the whole list | Every keystroke or filter change can re-render many rows | **Medium** | Work orders list | Memoize list row component with `React.memo`; ensure option arrays from server are stable (same reference when filters don’t change). Use `useDeferredValue` for search input so the list doesn’t block. | Smoother filter/search; less jank. |

---

## 8. Map component: loaded eagerly on dispatch

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| JS bundle | Dispatch map (e.g. Leaflet/Mapbox) is part of the main dispatch chunk | Increases initial JS for the dispatch page | **Medium** | Dispatch | Dynamic import the map panel: `const DispatchMapPanel = dynamic(() => import('./DispatchMapPanel'), { loading: () => <MapSkeleton /> })`. | Faster TTI on dispatch; map loads after board. |

---

## 9. Dashboard (operations): two large data loads

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Data loading | `loadOperationsDashboardData` and `loadOperationsIntelligenceData` both run; PM section uses Suspense | Dashboard waits for both until PM section suspends; good use of Suspense for PM | **Low** | Operations | Already using Promise.all internally and Suspense for PM. Add operations `loading.tsx` (see #2). Optionally defer “backlog” or “alerts” below the fold. | Perceived speed from skeleton. |

---

## 10. Assets list: sequential companies → properties → buildings → assets

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Data loading | Companies, then properties, then buildings, then assets with pagination | Four round-trips before assets; first three could be parallelized with a single query or parallel queries | **Low** | Assets list | Run companies + (properties + buildings in parallel where buildings use property ids from properties). If properties query is fast, do companies then Promise.all([properties, buildings(propertyIds)]). Requires fetching propertyIds from properties first or a different query shape. Leave for follow-up if needed. | — |

---

## 11. No stale-while-revalidate for static option data

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Caching | Companies, technicians, properties (option lists) are refetched on every visit | No caching; every navigation to work orders refetches dropdown data | **Low** | Work orders, dispatch, assets | Use `unstable_cache` or route segment config `revalidate` for option-list fetches where data is not highly dynamic. Risk: stale options (e.g. new company added). Use short revalidate (e.g. 60). | Fewer DB hits; faster repeat visits. |

---

## 12. Bundle: fonts and root layout

| Field | Issue | Why slow | Severity | Impacted | Fix | Expected impact |
|-------|--------|----------|----------|----------|-----|------------------|
| Fonts | Geist and Geist Mono loaded in root layout | Blocking or render-blocking if not optimized | **Low** | All pages | Next.js font optimization already in use; ensure `display: 'swap'` or similar. No change unless metrics show font delay. | — |

---

## Implementation order (Phase 2)

1. **Work orders option limits** — Add `.limit(500)` to assets and reasonable limits to other option queries.
2. **Operations loading skeleton** — Add `operations/loading.tsx`.
3. **Work orders list memoization** — Memoize row component; consider `useDeferredValue` for search.
4. **Dispatch map lazy load** — Dynamic import for map panel with skeleton.
5. **Work orders buildings/units** — Ensure single parallel round-trip (already structured; verify).
6. **Perceived performance pass** — Skeletons, progressive loading, and defer non-critical UI where applicable.

---

## DB indexes (recommendations)

Ensure indexes exist for:

- `work_orders (company_id, status)`, `work_orders (company_id, due_date)`, `work_orders (assigned_technician_id)`, `work_orders (scheduled_date)`
- `assets (company_id)`, `assets (property_id)`, `assets (building_id)`, `assets (unit_id)`
- `technicians (company_id, status)`
- `preventive_maintenance_plans (company_id, status, next_run_date)`

These are likely already present from initial schema; verify and add any missing.
