# Cornerstone Design System

Unified UI foundation for the operational decision platform. **Phase 1 complete** — tokens and primitives; screen redesigns follow in Phase 2+.

## Philosophy

- **One hero per page** — single focal surface; everything else supports it.
- **Orange** = primary actions only (Accept, Dispatch, Save, Connect).
- **Teal** = operational state (Live, Connected, GPS fresh, Healthy).
- **Green / Amber / Red / Blue** = success, warning, critical, information only.

## Architecture

```
app/design-system.css     ← tokens + utility classes (cs-*)
src/components/design-system/  ← approved primitives
src/components/ui/          ← backwards-compatible wrappers
src/components/fleet/ui/    ← deprecated aliases → design-system
```

Fleet dark theme: `[data-fleet-ui="true"]` on shell — same token names, charcoal values.

## Tokens

| Category | CSS variables |
|----------|----------------|
| Spacing | `--space-1` … `--space-16` |
| Typography | `--font-size-display` … `--font-size-micro`, `--font-size-kpi` |
| Surfaces | `--surface-canvas`, `--surface-default`, `--surface-raised`, `--surface-hero` |
| Brand | `--brand-action` (orange), `--brand-operational` (teal) |
| Semantic | `--status-success`, `--status-warning`, `--status-danger`, `--status-info` |
| Elevation | `--elevation-0` … `--elevation-3` |
| Radius | `--radius-sm` … `--radius-xl` |
| Motion | `--duration-fast`, `--ease-standard` |

Legacy aliases (`--accent`, `--card`, `--foreground`) map to new tokens for gradual migration.

## Approved primitives

| Primitive | Import | Replaces |
|-----------|--------|----------|
| `Surface` | `@/src/components/design-system` | raw divs |
| `Panel` | design-system | `Card`, `FleetPanel`, `CommandPanel` |
| `HeroPanel` | design-system | accent panels, page hero |
| `KpiCard` | design-system | `MetricCard`, `FleetKpi` |
| `StatusChip` | design-system | `StatusBadge`, `PriorityBadge`, `FleetStatusChip` |
| `Button` | `@/src/components/ui/button` | (refactored to orange primary) |
| `SectionHeader` | design-system | `FleetSectionHeader`, inline h2s |
| `PageLayout` | design-system | ad hoc `space-y-*` page wrappers |
| `Skeleton` | design-system | copy-paste `animate-pulse` blocks |
| `EmptyState` | design-system | `FleetEmptyState`, `TableEmptyState` patterns |
| `NavRail*` | design-system | sidebar internals |
| `TableShell` | design-system | `DataTable` shell |
| `ModalShell` | design-system | `Modal` |
| `DrawerShell` | design-system | `HelpDrawer` |
| `FormSection` | design-system | inline form sections |

## Typography classes

- `.cs-text-display` — marketing / rare
- `.cs-text-page-title` — page H1
- `.cs-text-section-title` — section H2
- `.cs-text-body` — default copy
- `.cs-text-caption` — secondary copy
- `.cs-text-micro` — KPI labels, table headers
- `.cs-text-eyebrow` — operational section labels (teal)
- `.cs-text-kpi` — metric values

## Surface levels (only four)

1. **Canvas** — page background
2. **Default** — subtle grouping
3. **Raised** — cards, panels, tables
4. **Hero** — single page focal point

## Phase 2 rollout (not started)

1. Fleet Command Center — hero = primary recommendation
2. Dispatch — hero = queue + map
3. Fleet Performance — hero = contribution chart
4. CMMS screens — migrate off glass cards

## Do not

- Add one-off `rounded-xl border bg-white` panels
- Use orange for decoration
- Use teal for primary CTAs
- Create parallel badge/KPI/card systems
