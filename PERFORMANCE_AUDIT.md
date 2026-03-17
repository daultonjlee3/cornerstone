# Performance Audit (Phase 1)

Prioritized bottlenecks discovered across auth, routing, work orders, dispatch, dashboard, detail pages, and data access.

## 1) Work Orders list overfetch + render pressure
- **Issue:** `work-orders` list query fetched full filtered result sets with no pagination and rendered every row.
- **Why it is slow:** Large payloads, expensive joins, and large DOM trees scale poorly with tenant size.
- **Severity:** **Critical**
- **Impacted screens:** `work-orders`
- **Proposed fix:** Add server-side pagination (`range` + `count`), keep sorting/filtering server-side, and render pagination controls.
- **Expected impact:** Major reduction in initial load time, memory usage, and table interaction latency.

## 2) Work order detail server waterfall
- **Issue:** Detail page executed many independent Supabase reads sequentially.
- **Why it is slow:** Avoidable serial round trips increase time-to-first-render.
- **Severity:** **High**
- **Impacted screens:** `work-orders/[id]`
- **Proposed fix:** Parallelize independent fetch groups with `Promise.all`.
- **Expected impact:** Faster detail page render and lower long-tail latency.

## 3) Dispatch duplicate modal mounts
- **Issue:** `DispatchView` mounted assignment/create modals twice (unconditional + conditional duplicate trees).
- **Why it is slow:** Duplicate React subtree mount/update work and extra prop/hook processing.
- **Severity:** **High**
- **Impacted screens:** `dispatch`
- **Proposed fix:** Keep single modal instances and control visibility via state.
- **Expected impact:** Reduced UI jank during dispatch interactions.

## 4) Dispatch filter route churn
- **Issue:** Dispatch filters triggered route pushes on each change.
- **Why it is slow:** Frequent route transitions re-run heavy server loading paths and add history churn.
- **Severity:** **High**
- **Impacted screens:** `dispatch`
- **Proposed fix:** Use replace-style URL updates for high-frequency filter changes and skip no-op updates.
- **Expected impact:** Faster-feeling filter interactions and smoother navigation.

## 5) N+1 material availability queries
- **Issue:** Material availability fetched balances/reservations pair-by-pair.
- **Why it is slow:** Query count scales with number of product/location pairs.
- **Severity:** **High**
- **Impacted screens:** `work-orders/[id]` materials flows
- **Proposed fix:** Batch balances/reservations by product/location sets and aggregate in memory.
- **Expected impact:** Significant reduction in DB round trips and response time.

## 6) Middleware profile lookup on most navigations
- **Issue:** Middleware performed user profile lookup broadly.
- **Why it is slow:** Extra DB round trip before route render on many requests.
- **Severity:** **High**
- **Impacted screens:** Most authenticated routes
- **Proposed fix:** Limit profile lookup to paths that require portal-vs-main redirect logic.
- **Expected impact:** Better authenticated-route TTFB and navigation responsiveness.

## 7) Post-login transition overhead
- **Issue:** Login/signup/auth hash flows had avoidable redirect/query overhead.
- **Why it is slow:** Extra auth/profile round trips and redirect hops delay post-login landing.
- **Severity:** **High**
- **Impacted screens:** `login`, `signup`, auth callback/hash flows
- **Proposed fix:** Redirect directly to operational landing and remove redundant profile lookup in login action.
- **Expected impact:** Faster sign-in completion and first meaningful paint after auth.

## 8) Work order filters causing heavy transition churn
- **Issue:** Filter interactions frequently trigger full navigations and stale search state behavior.
- **Why it is slow:** Frequent URL transitions and avoidable rerender churn degrade perceived speed.
- **Severity:** **Medium**
- **Impacted screens:** `work-orders`
- **Proposed fix:** Improve client filter state handling, prefer replace for iterative filter updates, and reset pagination on filter changes.
- **Expected impact:** Faster-feeling filter/search workflows.

## 9) Heavy dashboard intelligence path blocks render
- **Issue:** Operations page computes broad intelligence datasets even when only portions are needed.
- **Why it is slow:** Expensive data loading/aggregation increases response time.
- **Severity:** **Medium**
- **Impacted screens:** `operations`, reports/export
- **Proposed fix:** Split report-specific loaders and/or stream lower-priority sections behind Suspense.
- **Expected impact:** Faster first contentful dashboard paint.

## 10) Index opportunities for common work-order access patterns
- **Issue:** Some common filters/sorts/searches can still degrade under large tenant data.
- **Why it is slow:** Missing or non-optimal indexes increase scan cost.
- **Severity:** **Medium**
- **Impacted screens:** `work-orders`, `dispatch`, dashboard/reporting
- **Proposed fix:** Add/validate indexes for `(company_id, updated_at)`, scheduled/date/status combinations, assignment filters, and search strategy.
- **Expected impact:** Better query latency and lower database load at scale.
