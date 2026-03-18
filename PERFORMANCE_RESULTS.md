# Performance Results — Phase 2 & 3

**Date:** 2025-03  
**Scope:** High-impact fixes from PERFORMANCE_AUDIT.md and perceived-performance pass.

---

## Changes Implemented

### 1. Work orders option list limits (backend/data)

- **What:** Added `.limit(500)` to assets, `.limit(200)` to properties, `.limit(300)` to buildings, `.limit(500)` to units, `.limit(200)` to technicians/customers/vendors, `.limit(100)` to crews.
- **Why:** Prevents overfetching on large tenants; reduces payload and DB time for the work orders page.
- **Impact:** Faster TTFB and lower memory on work orders load; dropdowns still have 100–500 options. For tenants with more than 500 assets, the filter shows the first 500 (by name); consider adding typeahead/search for assets in a follow-up.

### 2. Operations Center loading skeleton

- **What:** Added `app/(authenticated)/operations/loading.tsx` with skeleton placeholders for header, KPI cards, asset health, technician activity, PM section, and backlog metrics.
- **Why:** Next.js shows this immediately on navigation to `/operations` while the server fetches dashboard data.
- **Impact:** Perceived speed: user sees instant feedback instead of a blank or layout-only screen; content streams in when ready.

### 3. Work orders loading skeleton

- **What:** Already present (`work-orders/loading.tsx`). No change; verified it exists and is used.
- **Impact:** Work orders navigation already shows a skeleton.

### 4. Dispatch loading and map

- **What:** Verified `dispatch/loading.tsx` and dynamic import of `DispatchMapPanel` with `ssr: false` and loading placeholder. No code change.
- **Impact:** Dispatch board and map already use code-splitting and loading states.

### 5. Perceived performance pass (see PERCEIVED_PERFORMANCE_PASS.md)

- **What:** Documented and applied patterns for instant-feeling navigation, skeletons, and progressive loading where already in place; added operations skeleton (above).
- **Impact:** Consistent loading UX; operations route no longer blocks without feedback.

---

## Measurable Improvements (expected)

| Screen / metric | Before | After | Notes |
|-----------------|--------|--------|------|
| Work orders initial load | Full option lists (unbounded) | Assets ≤500, properties ≤200, buildings ≤300, units ≤500, others limited | Reduces DB time and payload size on large tenants. |
| Operations navigation | No route loading UI | Skeleton (header + KPI + cards) | User sees structure immediately. |
| Dispatch | Already had loading + dynamic map | No change | Already optimized. |

---

## Benchmarks (recommended)

If you have Lighthouse or Web Vitals in place:

- **LCP:** Operations and work orders should improve from skeleton rendering and smaller payloads.
- **INP / FID:** No change in this pass; list row memoization deferred.
- **CLS:** Skeletons reduce layout shift by reserving space.

To compare before/after:

1. Clear cache, navigate to Work Orders (large tenant); measure TTFB and LCP.
2. Navigate to Operations; measure time to first paint (skeleton) vs time to full content.
3. Repeat with throttled CPU/network to stress perceived performance.

---

## Follow-up for bigger gains

- **List row memoization:** Extract `WorkOrderTableRow` with `React.memo` and stable callbacks (`useCallback`) in `work-orders-list.tsx` to cut re-renders when selection or drawer state changes.
- **Stale-while-revalidate:** Use `unstable_cache` or segment `revalidate` for option-list data (companies, technicians, etc.) with a short TTL (e.g. 60s) to speed repeat visits.
- **Auth/layout:** Consider caching tenant membership or skipping profile/tour fetch for non-portal users on fast path.
- **DB indexes:** Verify indexes on `work_orders(company_id, status)`, `work_orders(company_id, due_date)`, `work_orders(scheduled_date)`, and similar high-traffic filters.
