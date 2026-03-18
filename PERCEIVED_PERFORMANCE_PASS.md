# Perceived Performance Pass — User-Facing Speed

**Goal:** Make the app *feel* dramatically faster through instant feedback, skeletons, and progressive loading without breaking correctness.

---

## Priorities (in order)

1. Login and post-login transition  
2. Work orders  
3. Dashboards (Operations Center)  
4. Map / Dispatch  
5. Assets / Inventory lists  
6. Detail pages and forms  

---

## Changes Implemented

### 1. Login and post-login transition

- **Current behavior:** Login form submits via server action; redirect to `next` or `/operations`. Auth callback handles magic link / OAuth with `exchangeCodeForSession` or `setSession` then `router.replace(next)`.
- **Changes:** No code change. Auth callback already shows a loading state; redirect is a single client navigation. Recommendation: ensure `next` is set so users land where they expect (e.g. `/operations`) without an extra hop.
- **Perceived win:** Already reasonable; optional improvement is a short “Redirecting…” message with a spinner if the redirect takes >200 ms.

### 2. Work orders

- **Skeleton:** `work-orders/loading.tsx` already exists and shows header + filter bar + table skeleton. Verified in place.
- **Data:** Option list limits (see PERFORMANCE_AUDIT.md and PERFORMANCE_RESULTS.md) reduce server work and payload so the page can paint faster.
- **Filter/search:** Filters apply via URL (router.replace); no client-side filtering of a huge list. Search applies on blur/Enter in the filter panel; list is server-driven and paginated (50 per page). No blocking spinner over the whole page.
- **Perceived win:** Skeleton shows immediately on navigation; first content appears as soon as server responds; limits keep response time lower.

### 3. Dashboards (Operations Center)

- **Skeleton:** Added `operations/loading.tsx` with placeholders for:
  - Page title and subtitle
  - KPI cards (7)
  - Asset health + technician activity cards
  - PM Compliance section (heading + 4 KPIs + 2 cards)
  - Backlog metrics (4 cards)
- **Data loading:** Dashboard uses `loadOperationsDashboardData` and `loadOperationsIntelligenceData`; PM section already uses Suspense with `PmComplianceSectionSkeleton`. No change to data flow.
- **Perceived win:** Navigating to Operations shows the new skeleton immediately; then content fills in. No blank screen.

### 4. Map / Dispatch

- **Loading:** `dispatch/loading.tsx` shows header + technician columns skeleton. No change.
- **Map:** `DispatchMapPanel` is already loaded with `dynamic(..., { ssr: false, loading: () => <div>Loading dispatch map…</div> })`. Board and filters render first; map loads after.
- **Perceived win:** Board is interactive quickly; map appears when ready. No change in this pass.

### 5. Assets / Inventory lists

- **Loading:** `assets/loading.tsx` and `inventory/loading.tsx` exist. No change.
- **Lists:** Server-rendered with pagination; no client-side filtering of full dataset. Perceived speed is already good; optional improvement is to ensure loading skeletons match the list layout.

### 6. Detail pages and forms

- **Work order detail:** Full-page load; no skeleton for detail in this pass. Optional: add `work-orders/[id]/loading.tsx` for the detail view.
- **Forms:** Modals (e.g. create work order) open on client; no blocking full-page load. No change.

---

## Patterns applied

- **Skeletons instead of blocking spinners:** Operations and work orders (and dispatch, assets, inventory) use route-level `loading.tsx` so navigation shows structure immediately.
- **Progressive loading:** Dispatch loads the board first and the map dynamically; Operations uses Suspense for the PM section.
- **Preserving previous data during transitions:** Next.js keeps the previous route visible until the new one is ready when using loading.tsx, which avoids a flash of empty content.
- **Reducing layout shift:** Skeleton placeholders reserve space for KPIs and cards so when real content loads, layout shift is minimal.
- **Deferring below-the-fold / secondary content:** Map on dispatch and PM section on operations load after primary content.

---

## What was not changed (by design)

- **Auth flows:** No change to middleware or layout auth checks; correctness and security preserved.
- **Tenant scoping:** All queries still respect tenant/company; no change to data isolation.
- **CRUD and filters:** No removal of fields or filter options; only limits on option list size for work orders.
- **Optimistic UI:** Not added in this pass to avoid risk of inconsistent state; can be added later for actions like “mark complete” or “assign.”

---

## Follow-up recommendations

- Add `work-orders/[id]/loading.tsx` for the work order detail page.
- Consider a small “Redirecting…” state in the auth callback if `router.replace` takes longer than ~200 ms.
- For very large work order lists, consider virtualizing the table (e.g. react-window) if 50 rows ever feel slow to render.
- List row memoization in work-orders-list (see PERFORMANCE_RESULTS.md) for smoother selection and drawer interactions.
