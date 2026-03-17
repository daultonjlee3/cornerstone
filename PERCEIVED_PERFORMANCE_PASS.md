# Perceived Performance Pass (Phase 2b)

This pass focused on making the app *feel* faster in user interactions and route transitions, beyond pure backend throughput.

## What was changed

## 1) Faster-feeling login and protected route flow
- Removed extra post-login profile lookup from login action.
- Redirects now go directly to operational landing (`/operations`) instead of extra alias hops.
- Auth hash handler now routes directly to `/operations`.

**User-perceived effect:** less waiting after sign-in, fewer transition hops.

## 2) Work orders now become usable faster
- Added true server pagination (50 rows/page) for the work-orders list.
- Added explicit pagination controls and total counts.
- Kept filter/sort server-side while reducing row payload size.
- Converted filter URL updates to replace-style transitions and reset pagination on filter changes.
- Fixed search input behavior to avoid stale controlled-value churn.

**User-perceived effect:** first render is much quicker on large datasets, interactions feel lighter, and filtering/searching no longer causes excessive state churn.

## 3) Dispatch interaction smoothness improvements
- Removed duplicate modal subtree mounts in `DispatchView`.
- Added no-op guards + replace transitions for dispatch URL state updates.

**User-perceived effect:** less UI jank during dispatch interactions and reduced route/history churn from frequent filter changes.

## 4) Progressive operations dashboard rendering
- Split PM intelligence section behind Suspense with a skeleton fallback.
- Core operations KPIs/cards can render while intelligence section resolves.

**User-perceived effect:** page feels available sooner; users can start reading and acting before all secondary analytics finish loading.

## 5) Faster detail-page responsiveness
- Parallelized independent work-order detail queries with `Promise.all`.

**User-perceived effect:** less “waiting on blank detail page” before content appears.

## 6) Backend interaction latency improvements surfaced in UI
- Replaced N+1 material availability queries with batched reads.

**User-perceived effect:** materials-related sections and actions on detail pages respond faster, especially as line-item count grows.

## Design correctness and safety

- No business logic removed.
- No tenant scoping removed.
- No CRUD semantics intentionally changed.
- Routing/auth guards preserved (validated unauth redirect behavior for protected routes).

## Follow-up perceived-speed opportunities

1. Add optimistic UI for safe assignment/status updates on work-order list rows.
2. Introduce table virtualization for largest tenant datasets.
3. Add deferred/lazy map panel hydration for low-priority map widgets.
4. Persist previous list data during filter transitions in all large list pages.
