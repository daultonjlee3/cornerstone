# Cornerstone Fleet Design System

Operational decision platform UI for industrial fleets. Dark-first, premium, calm, and decision-focused.

## Philosophy

Every screen answers: **"What is the best decision to make right now?"**

Layout priority:

1. Recommended action
2. Operational health
3. Live fleet visibility
4. Financial impact
5. Supporting detail

## Theme activation

Fleet tenants (`fleet_intelligence`, `hybrid`) activate the operational dark theme via `data-fleet-ui="true"` on the authenticated shell. CMMS-only tenants keep the existing light theme.

**Tokens:** `app/globals.css` — `[data-fleet-ui="true"]` block  
**Primitives:** `src/components/fleet/ui/`  
**Utilities:** `src/lib/fleet/ui/format.ts`, `src/lib/fleet/ui/severity.ts`

## Color

| Token | Role |
|-------|------|
| `--background` | Charcoal canvas `#0e1218` |
| `--card` / `--card-elevated` | Panel depth |
| `--accent` | Brand teal `#2dd4bf` — primary actions, focus |
| `--success` | Operational OK, high confidence |
| `--warning` | Attention needed |
| `--danger` | Action required, critical |
| `--info` | Informational, scores |

Semantic colors only — never decorative.

## Typography

| Class | Use |
|-------|-----|
| `.fleet-eyebrow` | Section labels, uppercase accent |
| `.fleet-section-title` | Section headings |
| `.fleet-kpi-label` | Metric labels |
| `.fleet-kpi-value` | Dashboard numbers (tabular) |

Existing `.ui-page-title` / `.ui-kpi-value` remain for shared pages; fleet screens prefer fleet classes.

## Primitives

| Component | Purpose |
|-----------|---------|
| `FleetPanel` | Base surface (`default`, `elevated`, `accent`) |
| `FleetSectionHeader` | Eyebrow + title + description + action |
| `FleetKpi` | Operational metric card |
| `FleetStatusChip` | Severity / health / count pills |
| `FleetEmptyState` | Calm empty states |
| `FleetRecommendationCard` | Shared recommendation UI (hero + compact) |
| `FleetDataFreshness` | Live data indicator |

## CSS utilities

- `.fleet-panel`, `.fleet-panel-elevated`, `.fleet-panel-accent`
- `.fleet-chip--{critical|warning|success|info|neutral}`
- `.fleet-status-dot--{severity}`

## Screen rollout

| Screen | Status | Notes |
|--------|--------|-------|
| Fleet Command Center | ✅ Upgraded | Decision-first layout in `fleet-today-view.tsx` |
| Integration Center | ✅ Upgraded | `integrations-client.tsx` |
| Dispatch Intelligence | 🔄 Partial | Status bar uses fleet chips; recommendation card next |
| Fleet Performance | ⏳ Planned | Executive charts — next pass |
| Shell / nav | ✅ Theme | Wider max-width (1440px), dark tokens |

## Consolidation targets

- Retire duplicate severity styling in dispatch + today-view (use `src/lib/fleet/ui/severity.ts`)
- Unify `formatCurrency` → `formatFleetCurrency`
- Migrate `FleetDispatchRecommendationCard` to `FleetRecommendationCard`
- Remove dead: `fleet-command-center-section.tsx`, `fleet-recommendations-placeholder.tsx`

## Do not

- Copy reference mockup layout, colors, or branding
- Use pure black backgrounds
- Add gratuitous gradients, borders, or animation
- Break CMMS light theme for non-fleet tenants
