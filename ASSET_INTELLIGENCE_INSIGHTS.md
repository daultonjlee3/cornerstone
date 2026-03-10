# Asset Intelligence Insights

This document explains how the Asset Intelligence insights are generated and how operations teams should use them.

## How insights are generated

The insights engine (`src/lib/assets/assetIntelligenceInsightsService.ts`) analyzes:

- Health score and failure risk from `assetHealthService`.
- Work order history (repair volume, completion trends, downtime windows).
- Recurring and abnormal failure patterns from `assetPatternService`.
- PM compliance by checking overdue active PM plans.
- Maintenance spend vs replacement value.
- Asset age vs expected lifecycle.
- Parts replacement frequency from work order part usage history.

The engine produces normalized insight objects with:

- `id`
- `type`
- `severity` (`low | medium | high | critical`)
- `title`
- `description`
- `assetId`
- `assetName`
- `recommendation`
- `createdAt`

## Insight categories

Current rules produce these key categories:

- `critical_asset_health`
- `high_failure_risk`
- `replacement_candidate`
- `recurring_failure_pattern`
- `abnormal_repair_frequency`
- `pm_compliance_risk`
- `downtime_risk`
- `parts_replacement_frequency`
- `maintenance_cost_pressure`

## Severity logic

Severity is rule-based and operational:

- **Critical**: immediate operational or financial risk (severe health/risk, high downtime, high replacement pressure).
- **High**: strong negative trend requiring near-term intervention.
- **Medium**: meaningful risk trend that should be actively planned.
- **Low**: early warning signal.

## Dashboard usage

The Asset Intelligence dashboard (`/assets/intelligence`) is action-first:

- Top **Asset Intelligence Insights** cards show the highest priority risks with recommendations.
- **Health Distribution** categories are clickable and open the Assets page filtered by health status.
- **High Failure Risk** links directly to asset detail pages.
- **Top Recurring Failures** aggregates cross-asset failure patterns.
- **Replacement Candidates** surfaces lifecycle and cost pressure.
- **Maintenance Cost Leaderboard** includes maintenance-to-replacement percentage and recommendation guidance.

## API endpoints

Portfolio intelligence endpoints:

- `GET /api/assets/intelligence/insights`
- `GET /api/assets/intelligence/dashboard`
- `GET /api/assets/intelligence/failure-patterns`
- `POST /api/assets/intelligence/recalculate` (background/scheduled refresh)

Legacy-compatible endpoints remain available:

- `GET /api/assets/intelligence-dashboard`
- `POST /api/assets/intelligence-recalculate`

## Performance model

- Dashboard and insight queries use `unstable_cache` with revalidation.
- Cache tags are revalidated after asset/work order mutations.
- Incremental updates run when work orders are completed and when part usage is logged.
- Scheduled refresh can be triggered through the recalculate endpoint for stale assets.
