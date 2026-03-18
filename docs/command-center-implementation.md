# Command Center List–Detail Implementation

This document describes the shared list–detail workspace pattern and its first application to Work Orders. The same system is intended for Assets, Requests, Inventory, and other list-based modules.

## Overview

**Interaction model:** List → Select → Inspect → Act → Continue

- **Desktop (lg+):** Split layout; list on the left, detail pane on the right. List and filters stay visible; selecting another row updates the pane in place.
- **Tablet:** List full width; detail opens as a right-side slide-over drawer.
- **Mobile:** List full width; detail opens as a full-screen sheet with back button and sticky bottom action bar.

Existing full-page detail routes (e.g. `/work-orders/[id]`) are kept as fallbacks and deep-link destinations.

---

## Files Created

### Shared system (`src/`)

| File | Purpose |
|------|--------|
| `src/lib/use-media-query.ts` | `useMediaQuery(query)`, `useIsLg()`, `useIsMd()` for responsive behavior. |
| `src/components/command-center/command-center-layout.tsx` | Main layout: grid on desktop, overlay on tablet/mobile. Renders detail in one place (no double mount). |
| `src/components/command-center/detail-drawer.tsx` | `DetailDrawer`, `DetailDrawerBody` – structure for pane content and scroll. |
| `src/components/command-center/detail-header.tsx` | `DetailHeader` – sticky title, subtitle, badges, “View full” link, back/close. |
| `src/components/command-center/detail-tabs.tsx` | `DetailTabs` – simple tab strip for Details / Activity / Tasks / Notes / Parts (or module-specific). |
| `src/components/command-center/detail-action-bar.tsx` | `DetailActionBar` – horizontal primary actions; optional sticky bottom on mobile. |
| `src/components/command-center/index.ts` | Re-exports for the command-center components. |
| `src/components/command-center/saved-views-bar.tsx` | **SavedViewsBar** – generic saved-views row; sets a URL param (e.g. `view`) to filter the list only. |
| `src/components/command-center/summary-cards-bar.tsx` | **SummaryCardsBar** – generic summary card row using `MetricCard`; optional click-to-filter (sets view param). Counts must be computed separately from list filters. |

### Work Orders (first rollout)

| File | Purpose |
|------|--------|
| `app/(authenticated)/work-orders/components/work-order-command-center-pane.tsx` | Work Order detail pane: header, key info, tabs (Details, Activity, Tasks, Notes, Parts), action bar (Assign, Change status, Edit, Add note). Reuses list row data and existing actions. |

### Modified

| File | Changes |
|------|--------|
| `app/(authenticated)/work-orders/components/work-orders-list.tsx` | Uses `CommandCenterLayout`; list content = table + pagination; detail content = `WorkOrderCommandCenterPane` when a row is selected. Row click sets selected row; active row highlighted with `isActive`. Removed `WorkOrderDetailDrawer`. |
| `app/(authenticated)/work-orders/components/work-order-detail-drawer.tsx` | Unchanged; still exports `WorkOrderListRow` type used by the new pane. Can be removed or kept for type reuse. |

---

## Shared Components

- **CommandCenterLayout** – Receives `listContent`, `detailContent`, `isDetailOpen`, `onCloseDetail`, optional `emptyDetailMessage`. Desktop: two-column grid; tablet/mobile: detail in overlay. Detail is rendered only once (in grid or overlay) via `useIsLg()`.
- **DetailDrawer / DetailDrawerBody** – Wrapper and scrollable body for pane content.
- **DetailHeader** – Sticky header with title, subtitle, badges, “View full” link, back (overlay) or close.
- **DetailTabs** – Tabs with `id`, `label`, `content`; default tab and optional `className`.
- **DetailActionBar** – Action strip; `stickyBottom` for mobile overlay.

---

## Responsive Behavior

- **Breakpoint:** `useIsLg()` → `(min-width: 1024px)` (Tailwind `lg`).
- **Desktop (lg+):** Layout is a grid: `grid-cols-[1fr_minmax(380px,440px)]`. List in first column; second column is the detail pane (or empty state). No overlay.
- **Tablet / mobile (< lg):** Single column for list. When `isDetailOpen`, detail is rendered in `DetailOverlay`: fixed full-screen backdrop; panel is full width on mobile, `max-w-md` on tablet, slide-in from right. Back/close in header; action bar can use `stickyBottom`.

---

## State Management

- **Selected item:** Local React state in the list component (e.g. `detailDrawerRow` / `setDetailDrawerRow`). No URL sync in this phase.
- **Context preserved:** Filters, sort, pagination, and scroll are in the list; changing selection only updates the pane. No full page navigation for list → detail.
- **Extending later:** Other modules can use the same pattern (e.g. `selectedAsset`, `selectedRequest`) or add optional URL state (e.g. `?detail=id`) without changing the shared layout.

---

## Work Orders Pane Content

- **Header:** WO number, title, status + priority badges, overdue pill, “View full” link, back/close.
- **Key info (Details tab):** Assigned to, due date, scheduled, location, asset, source (from list row).
- **Tabs:** Details (key info), Activity / Tasks / Notes / Parts (links to full work order page for now).
- **Actions:** Assign (opens existing assignment modal), Change status (dropdown → `updateWorkOrderStatus`), Edit (opens form modal), Add note (links to full page). Existing actions and modals are reused.

---

## Stable summary cards and saved views

**Principle:** Summary card counts must **not** change when the user switches saved views. Only the list is filtered.

- **Stable counts:** Compute card counts with a **stats-only** base query (tenant/company scope only). Do **not** apply `view`, search, or list filters to this query.
- **List query:** Apply saved view (and other filters) only to the query that fetches the list and its pagination count.
- **Shared components:**
  - **SavedViewsBar** – `path`, `paramName` (default `"view"`), `views: { id, label, value }[]`. Clicking a view sets the URL param so the list re-fetches with that filter; card counts are unchanged.
  - **SummaryCardsBar** – `path`, `paramName`, `cards: { key, label, value, view?, icon?, tone?, variant?, description? }[]`. When `view` is set, the card is a button that sets that view param. Use for consistent KPI rows across modules.

Work Orders and Assets both use this pattern; Work Orders keeps its existing `WorkOrderKpiBar` and `WorkOrderSavedViews` (same behavior; could be refactored to use the shared bars later).

---

## Phase 2 Rollout (Assets, PM, Requests, Inventory, Vendors)

### Assets (done)

- **Stable summary cards:** Active, Needs Attention, Out of Service, Due for PM. Counts from `buildStatsBaseQuery()` (company scope only); list query applies `view` preset.
- **Saved views:** All, Active, Needs Attention, Out of Service, Due for PM. Use **SavedViewsBar** and **SummaryCardsBar** from command-center.
- **Detail pane:** **AssetCommandCenterPane** with `DetailHeader`, `DetailTabs` (Overview, Work Orders, PM), `DetailActionBar`. Data from **getAssetPaneData(assetId)** in `assets/actions.ts`.
- **Layout:** List wrapped in **CommandCenterLayout**; row click sets selected asset and opens pane.

### Preventive Maintenance (follow-up)

- Define stable card counts (e.g. Active Schedules, Due Soon, Overdue, Completed This Period) with a stats-only query; apply view only to list.
- Add **SummaryCardsBar** + **SavedViewsBar**; wrap list in **CommandCenterLayout** with a PM plan detail pane (schedule details, frequency, linked assets, recent WOs).

### Requests (follow-up)

- Stable cards: e.g. New, Unassigned, Overdue, Closed Today. Stats-only query; list filters by view.
- **CommandCenterLayout** + request detail pane (requester, location, notes, convert to WO, activity).

### Inventory (follow-up)

- Stable cards: e.g. In Stock, Low Stock, Out of Stock, Reorder Needed. Stats from inventory/balances scope only.
- **CommandCenterLayout** + part/location detail pane (stock by location, usage, reorder settings).

### Vendors (follow-up)

- Optional cards (e.g. Preferred, With Open POs). **CommandCenterLayout** + vendor detail pane (contact, services, related WOs/POs).

For each module:

- Add a `*CommandCenterPane` that composes `DetailDrawer`, `DetailHeader`, `DetailTabs`, `DetailActionBar`.
- Wrap the list in `CommandCenterLayout` with `listContent`, `detailContent` (pane when selected), `isDetailOpen`, `onCloseDetail`.
- Keep full-page detail routes; use “View full” in the pane to link to them.

---

## Performance Notes

- Detail content is mounted once (desktop grid or overlay), not twice.
- List row component is memoized; `isActive` drives only a class change.
- Pane uses list row data where possible; no extra fetch for the initial pane. Heavy sections (e.g. Activity, Parts) can be lazy-loaded or linked to full page later.
- Existing work order actions (`updateWorkOrderStatus`, assignment modal, form modal) are reused; no duplicated logic.

---

## Success Criteria

**Work Orders**

- [x] Work Orders uses list + detail pane workflow (desktop split, tablet/mobile overlay).
- [x] Shared components are reusable, not one-off.
- [x] Active row is clearly highlighted; filters/sort/scroll preserved when switching rows.
- [x] Full-page `/work-orders/[id]` remains; pane adds “View full” and does not replace the route.
- [x] Summary card counts are stable (stats-only query); saved views filter only the list.

**Assets**

- [x] Summary cards (Active, Needs Attention, Out of Service, Due for PM) use stats-only query; counts do not change when switching saved views.
- [x] SavedViewsBar and SummaryCardsBar; list filtered by view param.
- [x] CommandCenterLayout with AssetCommandCenterPane (Overview, Work Orders, PM tabs); getAssetPaneData(assetId).
- [x] Row click opens detail pane; “View full asset” links to `/assets/[id]`.
