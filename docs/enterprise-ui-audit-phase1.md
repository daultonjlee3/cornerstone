# Cornerstone Fleet Intelligence — Phase 1 Enterprise UI Audit

Date: 2026-06-25

## Scope audited

- Global shell: authenticated layout, sidebar, top bar, notifications, AI panel entry point.
- Primary operational routes: `/operations`, `/dispatch`, `/reports/operations`.
- Fleet management routes: `/fleet/jobs`, `/fleet/trucks`, `/fleet/operators`, `/fleet/sites`, `/branches`.
- CMMS + hybrid overlap zones that still appear in fleet/hybrid tenants.
- Shared UI layers: `app/design-system.css`, `app/globals.css`, `src/components/design-system/*`, `src/components/ui/*`.

## Current problems

- The product uses mixed UI systems simultaneously (`design-system`, `ui`, and `fleet/ui`) causing visual drift and inconsistent component quality.
- Navigation and header architecture are functional but not “mission control” grade; density, rhythm, and hierarchy vary between modules.
- Command center and dispatch experiences are visually stronger than CRUD pages, creating a premium-to-generic quality drop when users navigate.
- Data-dense surfaces are inconsistent in table hierarchy, sticky behavior, and inline action design.
- Map surfaces are useful but not yet treated as first-class visual anchors across operations workflows.

## UI inconsistencies

- Multiple card systems (`Card`, `Panel`, `MetricCard`, `KpiCard`) with different border radius, padding, shadow, and heading styles.
- Multiple status systems (`StatusBadge`, `PriorityBadge`, `StatusChip`, custom inline labels) with inconsistent color semantics and text density.
- Fleet routes rely on dark surfaces while non-fleet pages preserve brighter defaults with different contrast rules.
- Recommendation experiences differ between command center and dispatch, with separate card patterns and confidence language.

## Spacing issues

- Inconsistent vertical rhythm (`space-y-4`, `space-y-6`, `space-y-8`, arbitrary per-page clusters) without a single page cadence.
- Mixed padding scales in cards and table wrappers (`p-2`, `p-3`, `p-4`, `p-6`) resulting in jittery scanning.
- Header-to-content spacing differs significantly across pages, especially list management pages.
- Dense list rows and compact chips are combined with oversized section gaps in the same screens.

## Typography issues

- Heading hierarchy mixes tokenized classes with direct Tailwind sizes (`text-lg`, `text-sm`, `text-xs`) in adjacent components.
- Numeric emphasis is not consistently tabular or sized for executive scanning in all KPI contexts.
- Microcopy and metadata labels vary in casing/weight/tracking, reducing enterprise polish.
- Tables use small text but inconsistent weight and muted/primary balance, harming readability at scale.

## Hierarchy issues

- Too many “primary” elements per screen (headers, chips, badges, cards all competing for attention).
- Dispatch has strong information but weak sectional contrast between queue, lanes, recommendations, and capacity.
- Non-fleet list pages are mostly flat list + button layouts with limited contextual summary.
- Action priority is unclear in some modules: equal visual weight between high-impact and secondary actions.

## Visual clutter

- Repeated inline badges, tiny chips, and metadata lines in dispatch rows increase noise before essential signals are scanned.
- Legacy dashboard/CMMS sections still include many bordered blocks and helper rows that feel outdated compared to fleet surfaces.
- Mixed border/shadow strengths create “busy” panels rather than calm enterprise layering.
- Several components still combine old color classes (`red-*`, `amber-*`, etc.) with tokenized semantic colors.

## Navigation issues

- Sidebar grouping is logically rich but visual affordances for priority, active context, and section collapse state need stronger differentiation.
- Top bar currently lacks enterprise command affordances (persistent KPI strip, branch context, ops status prominence).
- Mobile/sidebar collapse interactions are functional but not visually cohesive with the premium desktop shell.
- Cross-product profile transitions (CMMS/hybrid/fleet) retain different visual identities.

## Accessibility issues

- Some interactive regions use very small text targets and dense controls in dispatch cards.
- Color meaning appears without redundant non-color cues in several status presentations.
- Mixed contrast on muted text over translucent surfaces can become borderline on some displays.
- Keyboard and focus behavior are present but not consistently emphasized in visual states across custom elements.

## Dark mode inconsistencies

- Fleet dark mode is token-driven, but many components still use light-biased backgrounds (`bg-white`) and ad-hoc color classes.
- Token variables are partially bypassed in module components, reducing theme consistency.
- Alert/info styles shift unpredictably between fleet pages and admin/list pages.
- Overlays and map legends use different tonal systems than surrounding panels.

## Responsiveness issues

- Dispatch becomes dense quickly on tablet widths with limited prioritization of map vs queue vs recommendations.
- Table-heavy management pages rely on horizontal scrolling but lack compact, responsive summary states.
- Header action clusters wrap inconsistently and can appear fragmented on medium breakpoints.
- Sidebar + content width transitions are serviceable but not yet optimized for fluid enterprise workflow on laptop widths.

## Pages/surfaces that feel outdated

- `/fleet/trucks`, `/fleet/operators`, `/fleet/jobs`, `/fleet/sites`, `/branches` list screens.
- Non-fleet blocks within `/operations` (legacy dashboard sections) compared to fleet command center styling.
- Several CMMS tables and alert panels that still use older card primitives and utility-class heavy layouts.
- Older dashboard-derived modules and helper containers with minimal enterprise visual hierarchy.

## Phase 2+ implementation priorities (frontend only)

1. Unify shell identity (sidebar, header, command strip, contextual controls).
2. Normalize design tokens and semantic status language across all page types.
3. Upgrade dispatch board and map-centric workflows to “operational heartbeat” quality.
4. Standardize all fleet entity management pages to enterprise table + summary shell patterns.
5. Continue migration of remaining legacy CMMS surfaces into shared design-system primitives.

