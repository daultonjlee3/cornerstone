# Technician Work Execution Workflow

This document describes the technician job execution flow implemented in Cornerstone, including lifecycle behavior and the key files changed.

## Technician workflow (field execution)

Primary route:

- `/technician/jobs/[workOrderId]`

Execution flow:

1. Technician opens assigned job from My Jobs.
2. Job header provides title, priority/status, due date, asset, location path, assigned technician/crew, and estimated duration.
3. Technician reviews **Asset Context** (health score, failure risk, last maintenance date, recurring issues, and asset history link).
4. Technician reviews **Work Instructions** (problem description, instructions, safety notes, and attachments).
5. Technician uses quick actions: **Start Job**, **Pause Job**, **Complete Job**, **Add Note**, **Add Photo**.
6. Technician executes checklist, logs notes/photos/parts, then completes the job.
7. Completion writes timeline/audit events, updates asset service history, and recalculates asset intelligence.

## Work order lifecycle behavior

Status lifecycle remains:

- `new` -> `ready_to_schedule` -> `scheduled` -> `in_progress` -> `on_hold` -> `completed`

Execution behaviors:

- Starting job opens/continues labor tracking.
- Pausing job closes active labor session.
- Completing job validates required fields and (optionally) enforces checklist completion.
- Completion updates work order completion fields, logs activity events, updates PM run/plan linkage when PM-sourced, and updates asset service metadata/intelligence.

## Timeline and audit trail

Technician timeline now includes:

- work order created
- assignment/schedule events
- status changes
- start/pause/complete events
- note/photo events
- checklist toggle/item-added events
- part-added events
- labor logged and completion notes events

Checklist and parts actions now write activity logs so the field timeline is complete.

## API layer

Implemented/extended endpoints:

- `GET /api/work-orders/{id}`
- `POST /api/work-orders/{id}/notes`
- `POST /api/work-orders/{id}/photos`
- `POST /api/work-orders/{id}/parts`
- `POST /api/work-orders/{id}/complete`

All endpoints require authenticated user context and reuse existing tenant/company-scoped server actions/services.

## Files changed

- `app/technician/jobs/[workOrderId]/page.tsx`
- `app/technician/components/technician-job-execution-view.tsx`
- `app/technician/components/notes-timeline.tsx`
- `app/(authenticated)/work-orders/actions.ts`
- `app/(authenticated)/work-orders/components/work-order-completion-modal.tsx`
- `app/(authenticated)/work-orders/components/work-order-form-modal.tsx`
- `src/lib/work-orders/technician-execution-service.ts`
- `app/api/work-orders/[id]/route.ts`
- `app/api/work-orders/[id]/notes/route.ts`
- `app/api/work-orders/[id]/photos/route.ts`
- `app/api/work-orders/[id]/parts/route.ts`
- `app/api/work-orders/[id]/complete/route.ts`
- `supabase/migrations/20260310020000_work_order_and_pm_safety_notes.sql`
