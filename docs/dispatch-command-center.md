# Dispatch Command Center

This document describes the in-place optimization of the existing `/dispatch` screen into a command-center workflow.

## Dispatch layout

- **Left panel**: Dispatch Queue (Overdue, Ready, Unscheduled)
- **Center**: Scheduling board (day/week/month)
- **Right panel**: Workload Insights

The center board now expands automatically as side panels collapse.

## Collapsible panels

### Left queue panel

- Queue supports **Collapse Queue** toggle.
- Collapsed mode uses a narrow vertical bar with:
  - queue label
  - job count badge
  - quick expand button
- Collapse state persists for the browser session via `sessionStorage`.

### Right insights panel

- Workload Insights panel also supports collapse/expand.
- Collapsed mode keeps a slim vertical bar visible for quick restore.
- State persists for the browser session via `sessionStorage`.

## Full screen mode

- Dispatch header includes **Full Screen** / **Exit Full Screen** action.
- In full screen mode:
  - app sidebar is hidden
  - top navigation/header is hidden
  - max-width wrapper is removed
  - dispatch board fills viewport for high-density scheduling

Mode is URL-driven using `dispatch_fullscreen=1`.

## Scheduling grid improvements

- Day lanes expand with available width and support horizontal scrolling when lane count is high.
- Drag interactions include stronger lane/slot highlighting and visible drop targets.
- Current-time line updates continuously and remains visually prominent.
- Drag-drop scheduling now uses optimistic UI updates so cards move immediately.
- If assignment update fails, local UI rolls back and an error banner is shown.

## Quick unscheduling

Two unschedule flows are supported:

1. Drag scheduled card into the queue drop zone.
2. Click **Unschedule** from card quick actions.

Both use optimistic updates with rollback on server error.

## Workload indicators and alerts

Right panel now includes:

- **Technician Capacity** bars (green/yellow/red utilization)
- **Crew Overview** bars with capacity ratios
- **Dispatch Alerts** (overdue, unscheduled, capacity pressure, available crews)
- **Quick Actions**
  - Create Work Order
  - Assign Unscheduled Jobs
  - Rebalance Workload

## Performance and interaction

- Derived queue/insight/crew data is memoized in the dispatch client view.
- Drag/drop and quick unschedule operations use minimal optimistic state updates.
- Server remains source of truth via existing `updateWorkOrderAssignment` action and post-mutation refresh.
