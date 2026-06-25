# Sprint 5B — Enterprise Implementation Center + Integration Center (UI Plan)

## 1) UI Architecture Audit

- Authenticated pages inherit app shell from `app/(authenticated)/layout.tsx`.
- Fleet/hybrid navigation is defined in `app/(authenticated)/nav-config.ts`.
- Sprint 5A backend surfaces already exist under `app/api/integrations/*`.
- Existing UI surface for integrations is limited to `/settings/integrations`.
- No `/implementation/*` route tree existed prior to Sprint 5B.

## 2) Existing Components To Reuse

- Layout: `PageLayout`, `PageSection`, `HeroPanel`, `Panel`.
- Information hierarchy: `SectionHeader`, `PageHeader`.
- Status and KPIs: `StatusChip`, `StatusBadge`, `KpiCard`.
- Tables and pagination: `DataTable` primitives, `Pagination`.
- Forms: `FormSection`, `FormField`, `Button`, `ui-input/ui-select/ui-textarea`.
- States: `SkeletonText`, `SkeletonKpiGrid`, `EmptyState`.

## 3) Route Plan

- `/implementation`
- `/implementation/connections`
- `/implementation/connections/[key]`
- `/implementation/imports`
- `/implementation/baseline`
- `/implementation/readiness`
- `/implementation/sync-history`
- `/implementation/settings`

## 4) Component Plan

- Shared layout + sub-nav in `app/(authenticated)/implementation/layout.tsx`.
- Overview dashboard client with readiness/progress/checklist.
- Connections page with connector cards and actions.
- Connector detail page with tabs for overview/config/auth/mappings/sync/logs/health/stats.
- Imports workflow page for auto-detect, mapping, validation, preview, execute, and history.
- Baseline KPI dashboard with lookback selector and estimated labels.
- Readiness score + actionable issue table.
- Sync history + logs table with search/filter/pagination.
- Settings form persisted through existing company + operating rules tables.

## 5) Data Fetching Plan

- Read:
  - `/api/integrations/readiness`
  - `/api/integrations/baseline`
  - `/api/integrations/connectors`
  - `/api/integrations/connectors/[key]`
  - `/api/integrations/sync-history`
  - `/api/integrations/sync-logs`
  - `/api/integrations/import/history`
  - `/api/integrations/import/templates`
- Write:
  - `/api/integrations/connectors` (connect)
  - `/api/integrations/connectors/[key]` (disconnect/config)
  - `/api/integrations/retry-sync`
  - `/api/integrations/import/preview`
  - `/api/integrations/import/validate`
  - `/api/integrations/import/execute`
  - `/api/integrations/import/templates`
  - `/api/integrations/rest/ingest`

## 6) Backend Gaps

- Row-level import error detail API is not yet exposed (batch-level summaries are available).
- Provider workers beyond Samsara are framework-ready but not fully implemented end-to-end.
- Readiness issues table is written by services but not exposed as a dedicated listing endpoint.
