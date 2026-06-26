"use client";

import { memo, useCallback } from "react";
import { Crosshair, Layers, Minus, Plus, RotateCcw } from "lucide-react";
import { AppIcon, MapLayerIcon, type MapLayerName } from "@/src/components/design-system/icons";
import type { OperationalMapLayers } from "./types";

type OperationalMapControlsProps = {
  layers: OperationalMapLayers;
  onToggleLayer: (key: keyof OperationalMapLayers) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterFleet: () => void;
  onResetView: () => void;
  legendOpen: boolean;
  onToggleLegend: () => void;
  layerCounts?: Partial<Record<keyof OperationalMapLayers, number>>;
};

type LayerRowConfig = {
  key?: keyof OperationalMapLayers;
  label: string;
  icon: MapLayerName;
  future?: boolean;
};

const LAYER_ROWS: LayerRowConfig[] = [
  { key: "trucks", label: "Trucks", icon: "trucks" },
  { key: "jobs", label: "Jobs", icon: "jobs" },
  { key: "recommendations", label: "Recommendations", icon: "recommendations" },
  { key: "routes", label: "Routes", icon: "routes" },
  { key: "branches", label: "Branch Coverage", icon: "branches" },
  { key: "capacity", label: "Capacity", icon: "capacity" },
  { key: "deadhead", label: "Deadhead", icon: "deadhead" },
  { key: undefined, label: "Traffic", icon: "traffic", future: true },
  { key: undefined, label: "Heatmap", icon: "heatmap", future: true },
];

const LEGEND_ITEMS = [
  { label: "Available", tone: "green" as const },
  { label: "Working", tone: "blue" as const },
  { label: "En Route", tone: "amber" as const },
  { label: "Offline", tone: "grey" as const },
];

const LayerSwitchVisual = memo(function LayerSwitchVisual({ on }: { on: boolean }) {
  return (
    <span className={`layers-panel__switch ${on ? "layers-panel__switch--on" : ""}`} aria-hidden>
      <span className="layers-panel__switch-thumb" />
    </span>
  );
});

type LayerRowProps = {
  config: LayerRowConfig;
  on: boolean;
  count?: number;
  onToggle: (key: keyof OperationalMapLayers) => void;
};

const LayerRow = memo(function LayerRow({ config, on, count, onToggle }: LayerRowProps) {
  const { key, label, icon, future } = config;

  const handleClick = useCallback(() => {
    if (!future && key) onToggle(key);
  }, [future, key, onToggle]);

  if (future || !key) {
    return (
      <div className="layers-panel__row layers-panel__row--future" aria-disabled="true">
        <span className="layers-panel__row-icon">
          <MapLayerIcon layer={icon} size="sm" />
        </span>
        <span className="layers-panel__row-label">
          {label}
          <span className="layers-panel__row-future">future</span>
        </span>
        <LayerSwitchVisual on={false} />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`layers-panel__row ${on ? "layers-panel__row--on" : ""}`}
      aria-pressed={on}
      onClick={handleClick}
    >
      <span className="layers-panel__row-icon">
        <MapLayerIcon layer={icon} size="sm" />
      </span>
      <span className="layers-panel__row-label">{label}</span>
      {count != null && count > 0 ? (
        <span className="layers-panel__row-badge" aria-label={`${count} items`}>
          {count}
        </span>
      ) : null}
      <LayerSwitchVisual on={on} />
    </button>
  );
});

export function OperationalMapControls({
  layers,
  onToggleLayer,
  onZoomIn,
  onZoomOut,
  onCenterFleet,
  onResetView,
  legendOpen,
  onToggleLegend,
  layerCounts,
}: OperationalMapControlsProps) {
  return (
    <div className="opmap-controls opmap-controls--layers">
      <div className="opmap-controls__group opmap-controls__group--zoom">
        <button type="button" className="opmap-controls__btn" aria-label="Zoom in" onClick={onZoomIn}>
          <AppIcon icon={Plus} size="sm" intent="muted" />
        </button>
        <button type="button" className="opmap-controls__btn" aria-label="Zoom out" onClick={onZoomOut}>
          <AppIcon icon={Minus} size="sm" intent="muted" />
        </button>
        <button type="button" className="opmap-controls__btn" aria-label="Center fleet" onClick={onCenterFleet}>
          <AppIcon icon={Crosshair} size="sm" intent="muted" />
        </button>
        <button type="button" className="opmap-controls__btn" aria-label="Reset view" onClick={onResetView}>
          <AppIcon icon={RotateCcw} size="sm" intent="muted" />
        </button>
        <button
          type="button"
          className={`opmap-controls__btn opmap-controls__btn--layers ${legendOpen ? "opmap-controls__btn--active" : ""}`}
          aria-expanded={legendOpen}
          aria-controls="opmap-layers-panel"
          aria-label="Toggle layers panel"
          onClick={onToggleLegend}
        >
          <AppIcon icon={Layers} size="sm" intent={legendOpen ? "operational" : "muted"} />
        </button>
      </div>

      {legendOpen ? (
        <aside
          id="opmap-layers-panel"
          className="layers-panel"
          role="region"
          aria-label="Map layers"
        >
          <header className="layers-panel__header">
            <h2 className="layers-panel__title">Layers</h2>
          </header>

          <div className="layers-panel__list" role="group" aria-label="Layer visibility">
            {LAYER_ROWS.map((config) => (
              <LayerRow
                key={config.label}
                config={config}
                on={config.key ? layers[config.key] : false}
                count={config.key ? layerCounts?.[config.key] : undefined}
                onToggle={onToggleLayer}
              />
            ))}
          </div>

          <footer className="layers-panel__legend">
            <p className="layers-panel__legend-title">Legend</p>
            <div className="layers-panel__legend-pills" role="list" aria-label="Truck status legend">
              {LEGEND_ITEMS.map(({ label, tone }) => (
                <span key={label} className="layers-panel__legend-pill" role="listitem">
                  <i className={`layers-panel__legend-dot layers-panel__legend-dot--${tone}`} aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </footer>
        </aside>
      ) : null}
    </div>
  );
}
