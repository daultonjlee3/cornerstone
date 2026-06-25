# Sprint 5A — Enterprise Integration Infrastructure (Backend-Only)

## Architecture Audit

### Existing integration backend foundation
- Integration persistence already exists in `integration_connections`, `integration_sync_runs`, and `external_entity_mappings`.
- Existing providers implemented in persistence/runtime: `csv_manual`, `samsara`, `webhook_jobs`, `webhook_telematics`.
- Ingest lifecycle already exists and is reusable: `startSyncRun` → processing → `finalizeIngestRun` → connection health update + optional notifications/mart refresh.
- Webhook secret verification is already implemented with secure hash comparison.

### Existing import foundations
- Import capabilities are currently fragmented across onboarding server actions and webhook/Samsara ingest.
- CSV parsing and mapping logic is duplicated in UI components; no single backend import engine exists.
- Fleet CSV onboarding imports already write sync runs (`csv_manual` connection) and reuse integration fabric.
- No dedicated persisted import-batch/import-row staging model currently exists.

### Existing readiness/baseline foundations
- Readiness-like signals exist but are scattered (connections health, telematics freshness, mart freshness, recommendations).
- No dedicated readiness/baseline API service exists.
- Baseline data inputs exist in `utilization_daily`, `fleet_jobs`, `branch_capacity_snapshots`, and recommendation tables.

### Existing auth, tenant isolation, and permission patterns
- Canonical auth context is `getAuthContext()` and tenant scoping with `auth.tenantId`.
- RLS uses `current_user_has_tenant(tenant_id)` across fleet/integration tables.
- Permissions already available for this domain: `fleet.view`, `fleet.manage`, `integrations.manage`.
- Service-role admin client pattern is already in place for webhook/cron ingestion.

### Existing API and webhook patterns
- Integration routes already under `app/api/integrations/*` with route handlers using `NextResponse` + auth checks.
- Cron patterns already exist under `app/api/cron/*` with `CRON_SECRET`.
- Webhook routes already follow provider-scoped endpoint conventions and call reusable ingest auth/pipeline helpers.

### Existing tests
- Strong test coverage exists around ingest pipeline, route auth, mart refresh behavior, and recommendation APIs.
- Missing coverage areas: reusable connector registry/service layer, centralized import engine, mapping template persistence, readiness/baseline services, and new backend APIs.

## Reuse Opportunities

- Reuse `integration_connections`, `integration_sync_runs`, and `external_entity_mappings` rather than creating v2 duplicates.
- Reuse `finalizeIngestRun()` as central sync completion logic and extend with richer logging.
- Reuse existing webhook auth helpers (`extractWebhookSecret`, `resolveWebhookConnection`) for new webhook framework abstraction.
- Reuse `getAuthContext`, `can`, and `requirePermission` for all new routes/services.
- Reuse existing mart/recommendation/fleet query sources for readiness and baseline computations.
- Reuse existing fleet CSV patterns and migrate parsing/mapping to shared backend import modules.

## Implementation Plan

1. Add a backend connector framework with provider catalog + normalized status/health view models.
2. Add additive Supabase migration for sync logs, import batches/rows, mapping templates, webhook event logs, and readiness issues (tenant-scoped + RLS + indexes).
3. Implement service layer modules for connector lifecycle, sync logging/history, import engine, validation engine, readiness, and baseline metrics.
4. Implement secure credential metadata abstraction with client-safe serialization.
5. Implement reusable webhook processing helpers with signature verification, dedupe support, event logging, and retry-attempt recording.
6. Implement unified REST ingestion API foundation and import APIs (preview/validate/execute/history/templates/mappings).
7. Add tenant-safe readiness and baseline API routes.
8. Add focused tests for new service abstractions and API auth behavior.

## Schema Changes (Planned)

- Additive migration (no duplicate replacement tables):
  - `integration_sync_logs`
  - `integration_import_batches`
  - `integration_import_rows`
  - `integration_mapping_templates`
  - `integration_field_mappings`
  - `integration_webhook_events`
  - `integration_webhook_delivery_attempts`
  - `integration_readiness_issues`
- All with `tenant_id`, RLS enabled, tenant isolation policies, and indexes for:
  - `tenant_id`
  - `provider`
  - `status`
  - `created_at`
  - `sync_run_id` / `import_batch_id` where applicable

## API Changes (Planned)

- New/extended tenant-safe integration endpoints:
  - connectors list/detail/connect/disconnect/config/health
  - sync history and sync logs
  - retry sync
  - import templates / mappings
  - import preview / validate / execute / history
  - readiness summary
  - baseline metrics

## Test Plan

- Add unit/integration tests for:
  - connector framework normalization and lifecycle operations
  - sync history and sync log services
  - import parsing and mapping persistence
  - validation engine rules and structured output
  - readiness and baseline service calculations
  - API route auth/permission/tenant isolation behavior
- Run:
  - targeted lint for changed files
  - `npx tsc --noEmit`
  - `npm run build`
  - relevant fleet/integration/import tests
