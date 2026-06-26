# App Icon System

Unified icon treatment for the authenticated product — aligned with fleet marketing chips while preserving operational density.

## Components

| Component | Path | Purpose |
|-----------|------|---------|
| `AppIcon` | `src/components/design-system/icons/app-icon.tsx` | Base Lucide wrapper (size, stroke, intent) |
| `IconChip` | `icon-chip.tsx` | Marketing-style 32/40/48 chip container |
| `MetricIcon` | `metric-icon.tsx` | KPI row — chip when prominent, bare otherwise |
| `StatusIcon` | `status-icon.tsx` | Operational status glyphs |
| `MapLayerIcon` | `map-layer-icon.tsx` | Lucide layer icons for map panel |

Import from `@/src/components/design-system` or `@/src/components/design-system/icons`.

## Usage patterns

### Navigation (compact — no chip)

```tsx
<AppIcon icon={Truck} size="sm" intent={active ? "operational" : "muted"} className="cs-nav-rail__item-icon" />
```

Nav rail items use `NavRailItem`, which applies this automatically.

### Page anchors

```tsx
<PageHeader iconLucide={Truck} title="Trucks" variant="surface" />
```

### KPI strip (dense grid)

```tsx
<KpiCard label="Active trucks" icon={Truck} emphasis="operational" iconProminent />
<KpiCard label="Utilization" icon={Percent} /> {/* bare AppIcon via MetricIcon */}
```

### Dispatch / AI anchors

```tsx
<IconChip icon={Sparkles} variant="ai" size="sm" glow label="AI recommendation" />
```

### Map layer panel (Lucide only — no FleetOperationIcon)

```tsx
<MapLayerIcon layer="trucks" size="sm" />
```

### Operational status

```tsx
<StatusIcon status="gps_delayed" size="xs" />
<StatusIcon status="critical" chip label="Critical alert" />
```

## CSS tokens (`app/design-system.css`)

- `--icon-xs` … `--icon-lg`, `--icon-stroke`
- `--icon-chip-sm|md|lg`, `--icon-chip-radius`, `--icon-chip-ring`, `--icon-chip-glow`
- `--icon-color-*` semantic colors

## Remaining exceptions

- **Map markers** (`src/components/fleet-map/markers/`, `fleet-icons.css`) — tactical HTML/SVG markers stay compact; not forced into chips.
- **FleetOperationIcon** — deprecated for UI panels; still used internally for legacy marker code paths.
- **Marketing site** — continues inline `fm-card` chip pattern under `data-fleet-marketing`; app uses `cs-icon-chip` tokens (equivalent visual language).
- **Bulk Lucide imports** — many list/table pages still use direct Lucide for one-off controls; migrate incrementally via `AppIcon`.

## Future: custom fleet markers

1. Keep marker geometry in `CornerstoneTruckSvg` / `html-markers.ts` but align stroke to `--icon-stroke` (1.75).
2. Use `FLEET_*_COLORS` tokens exclusively — already centralized in `tokens.ts`.
3. Selected/recommended states: teal ring from `--brand-operational-subtle` (matches IconChip fleet variant).
4. Do not embed Lucide inside map markers — markers stay single-path proprietary silhouettes for zoom clarity.
