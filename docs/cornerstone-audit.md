# Cornerstone MVP — Audit & Cleanup

Customer-ready hardening audit. Work is done in phases; each phase ends with a summary before the next.

---

## Phase 1 — Tenant Isolation / Auth / Permissions (Complete)

### Audit summary

**Data access paths reviewed**

- **Server actions**: Work orders, assets, properties, buildings, technicians, vendors, products, inventory, purchase orders, requests, preventive maintenance, onboarding, platform switch-tenant, portal impersonation. All validated tenant/company via `getTenantIdForUser` + `companyBelongsToTenant` or `getAuthContext` + `companyInScope`.
- **API routes**: work-orders (get, attachments, complete, notes, photos, parts, labor), assets (insights, intelligence, failure-patterns, timeline, health), reports/export, notifications. All either use `resolvePortalAccessContext` + technician-scoped payload, `getAssetIntelligenceContext` (tenant/company check), `getTenantIdForUser`/membership for tenant, or delegate to actions that enforce scope.
- **Page loaders**: Requests, vendors, products, inventory, purchase orders, dispatch, crews, units, etc. All use server-resolved scope (`getTenantIdForUser` or `getAuthContext`) and `.eq("tenant_id", …)` or `.in("company_id", scope.companyIds)`.
- **Request portal**: Company scope comes from `process.env.PORTAL_COMPANY_ID` (server-only). No client-provided tenant/company.
- **Technician/portal impersonation**: `company_id` in portal impersonation cookie is set server-side from the technician row when starting impersonation; not client-provided. Main-app impersonation uses cookie `actingAsUserId`; tenant/company are resolved from the effective user in `getTenantIdForUser` / `getAuthContext`.
- **Platform acting-tenant**: `switchToTenant(tenantId)` validates platform super admin and that the tenant exists in DB before setting the cookie.

**Findings**

- No cross-tenant access identified: all sensitive queries are scoped by tenant or company validated against the current user’s tenant.
- Duplication: `companyBelongsToTenant` was implemented locally in work-orders, assets, properties, and technicians actions. Replaced with a single implementation from `@/src/lib/auth-context`.
- Reports export used raw `user.id` + `tenant_memberships` and did not use `getTenantIdForUser`, so super-admin “work in tenant” (acting-tenant cookie) was not reflected. Fixed to use `getTenantIdForUser(supabase)` so exports match the current acting tenant.
- Portal and API safety documented with short comments (portal: `company_id` server-derived; failure-patterns API: `company_id` query param validated inside service).

### Issues fixed

1. **Centralized company-in-tenant check**  
   Replaced local `companyBelongsToTenant` in work-orders, assets, properties, and technicians actions with `companyBelongsToTenant` from `@/src/lib/auth-context`. Pass `supabase` where available to avoid extra client creation.

2. **Reports export tenant scope**  
   Reports export now uses `getTenantIdForUser(supabase)` instead of `user.id` + `tenant_memberships`, so super-admin “work in tenant” (acting-tenant cookie) is respected and the export is for the correct tenant.

3. **Auth-context documentation and helper**  
   - JSDoc on `companyBelongsToTenant` and `canAccessCompany` stating they must be used to validate client-provided `company_id` in server actions and API handlers.  
   - New `ensureCompanyInScope(companyId, supabase?)` that throws if the company is not in scope (single call for “validate and abort if not allowed”).

4. **Safety comments**  
   - Portal: `ImpersonationSession` documents that `company_id` is server-derived from the technician record.  
   - API assets failure-patterns: comment that `company_id` query param is validated inside `getPortfolioFailurePatterns` against tenant scope.

### Issues improved but not fully solved

- **Permission checks**: `can()` and `requirePermission()` from `@/src/lib/permissions` exist and use effective user/tenant; not every action calls them. Permission enforcement remains a mix of “tenant/company scope only” and explicit `requirePermission` where already used. No change in Phase 1; could be tightened in a later pass.
- **RLS**: Application code consistently applies tenant/company filters. No audit of Supabase RLS policies was performed. Recommend aligning RLS with the same tenant/company rules as a follow-up.

### Follow-up

- Consider using `ensureCompanyInScope(companyId, supabase)` in more actions for a single-line validation after reading `company_id` from formData.
- Review Supabase RLS on `work_orders`, `assets`, `companies`, `work_order_attachments`, and other multi-tenant tables so that direct DB access (e.g. service role) cannot bypass app-level checks.
- Optionally: reports export and other API routes that use `user.id` for membership could be switched to effective user for consistency with impersonation (currently they use real user; behavior is acceptable for tenant isolation).

### Assumptions

- Request portal is single-company per deployment (`PORTAL_COMPANY_ID`).  
- Platform super-admin “work in tenant” is intended to affect all server-resolved scope (e.g. reports export); that behavior is now consistent.  
- Main-app impersonation is cookie-based; tenant/company always resolve from the effective (acting) user.  
- Portal technician impersonation is separate (different cookie); scope is technician’s company and assignments; no cross-tenant use.

---

## Phase 2 — Dispatch Board / Map Stability and Performance (Complete)

### Audit summary

**Dispatch map implementation**

- **Map stack**: react-leaflet `MapContainer`, `Marker`, `Polyline`, `TileLayer`; `useMap` / `useMapEvents` for resize and fitBounds. Map is loaded via dynamic import with `ssr: false` in `DispatchView`, and again inside `DispatchMapPanel` with a client-only mount guard (`mapMounted` state) before rendering `MapContainer`.
- **fitBounds**: `FitBoundsToDispatchPoints` runs in `useEffect` when a signature (serialized point coords) changes; ref guards so the same bounds are not applied twice. fitBounds only runs when the visible point set materially changes.
- **invalidateSize**: `MapResizeOnMount` uses ResizeObserver, debounced (250ms), and only calls `invalidateSize` when container width/height actually change; avoids loops.
- **Pan to selected**: `PanToSelectedWorkOrder` runs when `selectedLatLng` changes; does not conflict with fitBounds because fitBounds is driven by point-set signature, not selection.
- **Map center**: `MapContainer` receives `center={mapCenterTuple}` (memoized from work orders + technicians). No `key` was causing remounts; a stable `key="dispatch-map"` was added so React does not remount the map when parent structure changes.
- **Conditional map in combined view**: When "Hide map" was toggled, the map was unmounted (conditional render). Re-opening "Show map" remounted the map, causing a full re-init and jitter. The combined view now keeps the map in the DOM and only toggles visibility (wrapper uses `hidden` when map is hidden), so the map instance persists across show/hide.
- **Markers**: Work order markers previously recreated `divIcon` and new `eventHandlers` objects every render, causing react-leaflet to update all markers on any hover/selection change. A memoized `WorkOrderMarker` component was added: it uses `useMemo` for icon and eventHandlers and `React.memo` so only the marker(s) whose selection/hover state changed re-render.

**Findings**

- Map instance now initializes once per view and persists when toggling the map panel in combined view (no remount on "Show map").
- fitBounds and invalidateSize were already guarded; no loops observed. Left as is with existing debounce/signature logic.
- Marker/icon churn was reduced by memoizing per-marker icon and eventHandlers and by using a memoized subcomponent for work order markers.
- Route polyline and technician markers: `routePolylinePositions` and technician list were already memoized; no change. Cluster markers use a simple static icon; left as is.

### Issues fixed

1. **Map remount when toggling "Show map" in combined view**  
   In `DispatchView`, the combined-view map is always rendered when in combined mode; the wrapper div toggles `className` (with `hidden` when map is hidden) instead of conditionally rendering the map. The map stays mounted and only becomes visible again when the user clicks "Show map", avoiding jitter and repeated map resets.

2. **Stable MapContainer key**  
   `DispatchMapPanel` now passes `key="dispatch-map"` to `MapContainer` so React does not remount the map when the parent re-renders or structure changes.

3. **Memoized work order markers**  
   - New `WorkOrderMarker` component (wrapping `Marker` + `Popup`) with `React.memo`.  
   - Icon is `useMemo`-ed from `workOrderPinIcon(...)` with dependencies on the fields that affect the icon (id, status, dates, assignment, selectedDate, isSelected, isHovered).  
   - `eventHandlers` is `useMemo`-ed with dependencies on workOrder.id and the callback refs.  
   - Only the marker(s) whose selection or hover state changes re-render; other markers keep stable props and avoid full layer rebuilds.

### Issues improved but not fully solved

- **Map center**: `center={mapCenterTuple}` still updates when work orders or technicians change (memoized from data). That is intentional so the initial view reflects the data; fitBounds and pan-to-selected then drive the view. No change.
- **Two map instances**: In "map" view mode vs "combined" view mode, a different branch of the tree renders `DispatchMapPanel`, so switching view modes still mounts a new map. Accepted as intentional (different layouts); no change.
- **Cluster popup handlers**: Cluster popups still use inline handlers for `onMarkerSelect` / `onMarkerHover`; low impact and left as is.

### Follow-up

- If map feels sluggish with very large marker counts, consider clustering (e.g. leaflet.markercluster) or virtualizing markers.
- Optionally reduce resize debounce (e.g. 250ms → 150ms) if map feels slow to correct after panel open on slow devices.

### Assumptions

- "Right panel" means the work order details panel; it does not unmount the map, so no change was needed there beyond keeping the map mounted when "Hide map" is used.
- ResizeObserver + debounce + invalidateSize is sufficient when the map is shown again after being hidden (container gains size and observer fires).

---

## Phase 3 — Work Order Lifecycle Consistency (Complete)

### Audit summary

**Canonical status and transitions**

- **work-orders/actions.ts** held the only full definition: `LEGACY_STATUS_MAP` (open→new, assigned→ready_to_schedule, closed→completed), `ALL_SUPPORTED_STATUSES`, `TERMINAL_STATUSES`, `TRANSITIONS`, and helpers `normalizeStatus`, `toComparableStatus`, `canTransitionStatus`, `isSupportedStatus`. Used in `saveWorkOrder`, `updateWorkOrderStatus`, `bulkUpdateWorkOrderStatus`, `updateWorkOrderAssignment`, `completeWorkOrder`, and assignment/status checks.
- **DispatchView** duplicated `normalizeStatus` (same legacy mapping) for categorizing work orders (overdue, ready, scheduled, in progress, terminal). No transition checks in UI; only classification.
- **Dashboard** (operations.ts, operations-intelligence.ts) uses inline status lists (e.g. `["new", "ready_to_schedule", "scheduled", "in_progress", "on_hold"]` and `.not("status", "in", "(completed,cancelled)")`) that match the canonical “open” set but are not shared.
- **Types**: `src/types/work-order.ts` had `WorkOrderStatus` with draft, open, assigned, in_progress, on_hold, completed, cancelled and was missing new, ready_to_schedule, scheduled, closed.

**Lifecycle behavior**

- Status changes go through `updateWorkOrderStatus` (with transition checks and activity log) or `completeWorkOrder` (completed path with labor, activity, notifications). Assignment changes use `updateWorkOrderAssignment`, which derives next status (scheduled vs ready_to_schedule) from schedule + assignment; no separate transition check there but result is consistent.
- Terminal statuses block further status and assignment changes. Completion is only via `completeWorkOrder`, not `updateWorkOrderStatus`.

### Issues fixed

1. **Shared work order status module** (`src/lib/work-orders/status.ts`)
   - Single source for: `LEGACY_STATUS_MAP`, `ALL_SUPPORTED_STATUSES`, `TERMINAL_STATUSES`, `TRANSITIONS`, `normalizeStatus`, `toComparableStatus`, `canTransitionStatus`, `isSupportedStatus`, and new `isTerminalStatus`.
   - Added `OPEN_WORK_ORDER_STATUSES` for dashboards/filters so “open” can be defined in one place in future.
   - Pure helpers only; safe to use from server and client.

2. **work-orders/actions.ts**
   - Removed local status constants and functions; now imports `TERMINAL_STATUSES`, `normalizeStatus`, `toComparableStatus`, `canTransitionStatus`, `isSupportedStatus` from `@/src/lib/work-orders/status`. Behavior unchanged.

3. **DispatchView**
   - Removed duplicate `normalizeStatus`; imports `normalizeStatus as normalizeWorkOrderStatus` from `@/src/lib/work-orders/status`. All usages (overdue/ready/scheduled/in-progress/terminal classification) now use the shared helper.

4. **Types**
   - `WorkOrderStatus` in `src/types/work-order.ts` extended to include `closed`, `new`, `ready_to_schedule`, `scheduled` so types align with canonical statuses and legacy values.

### Issues improved but not fully solved

- **Dashboard status lists**: `src/lib/dashboard/operations.ts` (and operations-intelligence) still use inline arrays for “open” statuses. They match the canonical set; could later import `OPEN_WORK_ORDER_STATUSES` or a small helper for consistency. No change in Phase 3 to limit scope.
- **PM-generated work orders**: Created with status from PM flow; not audited in detail. They use the same status values and are updated via the same actions.
- **Asset history / notifications**: Activity logging and notifications are already triggered from the same actions (updateWorkOrderStatus, completeWorkOrder, updateWorkOrderAssignment). No duplication of transition logic there.

### Follow-up

- Use `OPEN_WORK_ORDER_STATUSES` or `isTerminalStatus` in dashboard queries and report logic to avoid drift from ad hoc status lists.
- If more UI needs to show “allowed next statuses,” expose a small helper from the status module (e.g. `getAllowedNextStatuses(currentStatus)`).

### Assumptions

- Legacy values (open, assigned, closed) remain in DB/API and are normalized only when doing transitions or classification; no mass data migration.
- Completion must stay a dedicated flow (`completeWorkOrder`) with resolution, labor, and notifications; not via generic status update.

---

## Phase 4 — Async Workflows / Notifications / Scheduled Automation (Complete)

### Audit summary

**Workflows identified**

- **Synchronous (inline in server actions)**  
  - Work order created: `createNotification` (in-app, single user) in work-orders/actions saveWorkOrder.  
  - Work order assigned: `createTenantNotification` + `sendEmailAlert` in updateWorkOrderAssignment (try/catch, best-effort).  
  - Maintenance request created: `createTenantNotification` + `sendEmailAlert` in requests/actions (try/catch, best-effort).  
  - Work order completed: activity logs and PM run updates in completeWorkOrder; no separate notification call found for “completion” broadcast (optional for later).

- **On-demand (triggered by user request)**  
  - **GET /api/notifications**: Calls `syncDueNotificationsForUser(userId, companyIds)`, which queries overdue work orders and PM plans due in the next 3 days, then calls `createNotifications` per entity. Idempotent: `createNotifications` skips users who already have an unread notification for the same (event_type, entity_type, entity_id). If any overdue or PM-due-soon notifications were created, the route sends a company-level email via `sendEmailAlert` (overdue and/or PM due soon). No cron; sync runs only when a user fetches notifications.

- **Scheduled / PM generation**  
  - **Preventive maintenance**: No cron or background job. PM work orders are created only when: (1) a user runs “Generate now” for a plan (`generatePreventiveMaintenanceNow`), or (2) a user runs “Generate due runs” (`generateDuePreventiveMaintenanceRuns`). Both call `processPlanRun`, which inserts a row into `preventive_maintenance_runs`. Duplicate (plan_id, scheduled_date) is prevented by a unique constraint; on 23505 the run is skipped (idempotent).

**Existing safeguards**

- `createNotifications`: Dedupes by (event_type, entity_type, entity_id, user_id) for unread notifications before insert.  
- `processPlanRun`: Unique constraint on runs table prevents duplicate run per plan/date.  
- Assignment and request submission wrap notification/email in try/catch so failures do not block the main action.

**Gaps / risks**

- Email delivery was silent on failure (no logging).  
- No single place documenting that “scheduled” behavior is on-demand (notification sync) or user-triggered (PM runs).

### Issues fixed

1. **Idempotency and behavior documented**  
   - **createNotifications**: JSDoc added stating it is idempotent per (event_type, entity_type, entity_id, user_id) by skipping users who already have an unread notification for that event/entity.  
   - **syncDueNotificationsForUser**: JSDoc added stating it is called on-demand when fetching notifications and is idempotent via createNotifications.  
   - **GET /api/notifications**: File-level comment added that the route runs on-demand sync and that sync is idempotent.  
   - **processPlanRun** (preventive-maintenance/actions): Inline comment added that duplicate run for the same plan+date is prevented by unique constraint (23505 = skipped).

2. **Visibility for email failures**  
   - **sendEmailAlert**: Now logs (console.warn) when: config is missing (RESEND_API_KEY or NOTIFICATION_FROM_EMAIL) and there are valid recipients; Resend API returns non-ok (status + short body); or fetch throws. Logging is skipped when `NODE_ENV === "test"` to avoid test noise. Callers remain unchanged (best-effort, non-blocking).

3. **JSDoc for sendEmailAlert**  
   - Documented that it is best-effort and that callers should not block on it.

### Issues improved but not fully solved

- **PM runs**: Still only user-triggered. If desired, a cron or scheduled job could call `generateDuePreventiveMaintenanceRuns()` (with a service role or system user); not implemented in Phase 4.  
- **Notification sync**: Runs on every GET /api/notifications; for large tenants this could be optimized (e.g. throttle per user, or move to a daily job). No change in Phase 4.  
- **Retry**: No retry for sendEmailAlert or createNotifications; failures are logged (email) or thrown (notifications). Optional retry could be added later.

### Follow-up

- Consider a scheduled job (e.g. Vercel cron) to call `generateDuePreventiveMaintenanceRuns()` so PM work orders are generated even when no one opens the PM page.  
- Consider throttling or moving overdue/PM-due-soon sync to a background job if GET /api/notifications becomes slow for large tenants.  
- Optionally add retry with backoff for sendEmailAlert for transient Resend failures.

### Assumptions

- In-app notifications are the source of truth; email is a best-effort alert.  
- No cron exists today; all “scheduled” behavior is either on-demand (sync on notification fetch) or explicit user action (PM generate).  
- Unique constraint on preventive_maintenance_runs (plan_id, scheduled_date) exists; 23505 is the Postgres unique violation code.

---

## Phase 5 — Dashboard / Metrics / Reporting Consistency (Complete)

### Audit summary

**Where metrics are computed**

- **Dashboard**: `loadOperationsDashboardData` in `src/lib/dashboard/operations.ts` — KPIs (open, in progress, completed today, overdue, scheduled today, active technicians, unassigned), backlog, alerts, asset health, technician activity. Uses hardcoded status arrays for “open” and “not terminal.”
- **Operations intelligence**: `loadOperationsIntelligenceData` in `src/lib/dashboard/operations-intelligence.ts` — PM compliance, completed on-time/late, missed, reports. Uses its own work order and PM run queries.
- **Work orders list**: Page and list derive stats (overdue, completedToday, etc.) from the same filtered work order query; definitions align with “overdue” = due_date < today and status not terminal, “completed today” = completed in today’s window.
- **Dispatch**: Dispatch data and view use `normalizeWorkOrderStatus` (from shared status module after Phase 3) for categorizing work orders; no separate count queries.

**Findings**

- **Single source of truth**: Phase 3 added `OPEN_WORK_ORDER_STATUSES`, `TERMINAL_STATUSES`, etc. in `src/lib/work-orders/status.ts`. The dashboard was still using inline arrays `["new", "ready_to_schedule", "scheduled", "in_progress", "on_hold"]` and `"(completed,cancelled)"` for terminal. Aligning these with the shared module avoids drift when status rules change.
- **Bug**: The empty-state return in `loadOperationsDashboardData` (when `companyIds.length === 0`) omitted `unassignedWorkOrders: 0` in `kpis`, which could cause type/UI issues.

### Issues fixed

1. **Shared status constants for dashboard**  
   - In `src/lib/work-orders/status.ts`: added **OPEN_ACTIVE_STATUSES** (open statuses for KPI counts, excludes draft) and **TERMINAL_STATUSES_ARRAY** (for Supabase `.not("status", "in", "(...)")` queries).  
   - **operations.ts** now imports `OPEN_ACTIVE_STATUSES` and `TERMINAL_STATUSES_ARRAY`, and uses them for: open work order count, unassigned count, overdue filter (not terminal), scheduled-today filter (not terminal), and overdue/high-priority alert queries. Terminal filter uses `notTerminalStatus` built from `TERMINAL_STATUSES_ARRAY` so “closed” is included consistently.

2. **Empty-state return**  
   - Added missing **unassignedWorkOrders: 0** to the `kpis` object in the empty return of `loadOperationsDashboardData` when there are no companies.

### Issues improved but not fully solved

- **operations-intelligence.ts**: Still uses inline status checks and its own date/window logic for PM compliance and report datasets. Could later use `OPEN_ACTIVE_STATUSES` / `TERMINAL_STATUSES_ARRAY` or a small shared “today”/window helper if we want one place for date boundaries. No change in Phase 5 to limit scope.
- **Work order list stats**: Derived client-side from the same query as the list; no separate server count. Definitions match dashboard (overdue, completed today). No change.
- **Dispatch counts**: Sourced from the same dispatch data load; no duplication with dashboard KPIs.

### Follow-up

- Use shared status constants (or a thin query helper) in operations-intelligence if PM compliance or report logic should stay in sync with work order status rules.  
- If more pages show “open” or “overdue” counts, derive them from the same constants or a small dashboard query module.

### Assumptions

- “Open” for dashboard KPIs excludes draft (OPEN_ACTIVE_STATUSES).  
- Terminal statuses are completed, cancelled, and closed; all three are used in `.not("status", "in", ...)` so that legacy “closed” is excluded from open/overdue counts.

---

## Phase 6 — Codebase Cleanup / Module Boundaries (Complete)

### Audit summary

**Scope**

- Thin UI components and move business logic to services/helpers where it already exists; remove dead/duplicate code; consolidate constants/types/helpers. No big reorg or enterprise architecture.

**Findings**

- **Preventive maintenance actions**: Had a local `companyBelongsToTenant` implementation; aligned with Phase 1 by importing from `@/src/lib/auth-context` so all company-in-tenant checks use the same helper.
- **Date handling**: Dashboard (`operations.ts`, `operations-intelligence.ts`) and notifications (`notifications.ts`) each had a local `dateOnly` (or equivalent) returning `date.toISOString().slice(0, 10)` for UTC YYYY-MM-DD. No semantic difference; duplication only.

### Issues fixed

1. **PM actions company scope**  
   `app/(authenticated)/preventive-maintenance/actions.ts` now imports `companyBelongsToTenant` from `@/src/lib/auth-context`; local implementation removed. All company-in-tenant checks across the app use the same helper.

2. **Shared date helper**  
   - New **`src/lib/date-utils.ts`**: `dateOnlyUTC(date)`, `todayISOUTC()`.  
   - **operations.ts**: Removed local `dateOnly`; uses `dateOnlyUTC` for today and PM window dates.  
   - **operations-intelligence.ts**: Removed local `dateOnly`; uses `dateOnlyUTC` for today and date-range defaults.  
   - **notifications.ts**: Removed local `dateOnly`; uses `dateOnlyUTC` in `addDays` and for today in `syncDueNotificationsForUser`.  
   Semantics unchanged (UTC YYYY-MM-DD).

### Issues improved but not fully solved

- **Broader cleanup**: No sweep for other duplicate helpers or dead code beyond the above. UI components were not thinned; business logic already lives in actions and lib modules. Optional follow-up: audit other `actions.ts` files for any remaining local scope/date helpers.

### Follow-up

- Optionally use `ensureCompanyInScope(companyId, supabase)` in PM (and other) actions for single-line validation.
- If more date boundaries (e.g. “start of week”) are needed, extend `date-utils.ts` rather than adding local helpers.

### Assumptions

- Date handling remains UTC for server-side dashboard/notifications; no timezone or “local date” requirement.
- Phase 6 scope is minimal: centralize the identified duplicates only; no large refactor.

---

## Final deliverables

### Audit summary (all six areas)

| Area | Outcome |
|------|--------|
| **1. Tenant isolation / auth** | All data access tenant/company-scoped; `companyBelongsToTenant` centralized in auth-context; reports export respects acting-tenant; safety comments added. |
| **2. Dispatch map** | Map no longer remounts when toggling “Show map”; stable MapContainer key; memoized work order markers to reduce re-renders. |
| **3. Work order lifecycle** | Single status/transition source in `src/lib/work-orders/status.ts`; actions and DispatchView use it; types extended. |
| **4. Async / notifications** | Idempotency and on-demand behavior documented; email failures logged; PM duplicate run prevented by DB constraint. |
| **5. Dashboard / metrics** | Dashboard uses `OPEN_ACTIVE_STATUSES` and `TERMINAL_STATUSES_ARRAY` from status module; empty-state return fixed. |
| **6. Cleanup** | PM actions use shared `companyBelongsToTenant`; shared `dateOnlyUTC`/`todayISOUTC` in `date-utils.ts`; dashboard and notifications use it. |

### Issues fixed (consolidated)

1. Centralized `companyBelongsToTenant` (work-orders, assets, properties, technicians, **preventive-maintenance** actions) and added `ensureCompanyInScope`; reports export uses `getTenantIdForUser`.
2. Auth-context JSDoc and safety comments (portal, failure-patterns API).
3. Dispatch: map stays mounted when hiding panel; stable map key; memoized `WorkOrderMarker`.
4. Shared work order status module; actions and DispatchView use it; `WorkOrderStatus` type extended.
5. Notifications/PM: idempotency and behavior documented; email failures logged; PM duplicate-run comment.
6. Dashboard: shared open/terminal status constants; empty-state `unassignedWorkOrders: 0`.
7. Shared date helper; dashboard and notifications use `dateOnlyUTC`/`todayISOUTC`.

### Issues improved but not fully solved

- Permission checks: not every action calls `requirePermission`; RLS not audited.
- Map: two instances when switching view mode (accepted); cluster popups not memoized.
- Dashboard: operations-intelligence could later use shared status/date helpers.
- PM runs and notification sync: still on-demand/user-triggered; no cron.
- Broader codebase: no full dead-code or duplicate-helper sweep beyond Phase 6 items.

### Follow-up (prioritized)

1. **RLS**: Align Supabase RLS with tenant/company rules; audit tables used by actions/API.
2. **Cron**: Consider scheduled job for `generateDuePreventiveMaintenanceRuns()`.
3. **ensureCompanyInScope**: Use in more actions for single-line validation.
4. **Operations intelligence**: Use shared status/date helpers if PM compliance and reports should stay in sync.
5. Optional: throttle or move notification sync if GET /api/notifications becomes slow.

### Assumptions

- Request portal is single-company per deployment; platform acting-tenant and impersonation behavior as documented in Phase 1.
- Legacy work order status values remain; completion stays via `completeWorkOrder`.
- In-app notifications are source of truth; email is best-effort. No cron today.
- “Open” for KPIs excludes draft; terminal includes completed, cancelled, closed.
- Phase 6 limited to identified duplicates; no large reorg.

### Risky issues (addressed or documented)

- **Cross-tenant access**: None found; all paths scoped and validated. RLS still recommended as a backstop.
- **Reports export tenant**: Fixed so super-admin acting-tenant is respected.
- **Map jitter / remounts**: Fixed by keeping map mounted and memoizing markers.
- **Status drift**: Reduced by shared status module and dashboard constants.
- **Silent email failures**: Now logged (except in test).
- **Dashboard empty state**: Missing `unassignedWorkOrders` fixed.
