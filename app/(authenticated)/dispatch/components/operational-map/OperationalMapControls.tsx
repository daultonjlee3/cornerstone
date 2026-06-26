"use client";

import {
  Crosshair,
  Layers,
  ListTree,
  Minus,
  Plus,
  RotateCcw,
  Target,
} from "lucide-react";
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
};

const LAYER_ITEMS: Array<{ key: keyof OperationalMapLayers; label: string }> = [
  { key: "trucks", label: "Available trucks" },
  { key: "jobs", label: "Active jobs" },
  { key: "recommendations", label: "Recommendations" },
  { key: "routes", label: "Route overlays" },
  { key: "revenueAtRisk", label: "Revenue at risk" },
  { key: "branches", label: "Branch coverage" },
  { key: "capacity", label: "Capacity" },
  { key: "deadhead", label: "Deadhead" },
  { key: "gpsHealth", label: "GPS health" },
];

export function OperationalMapControls({
  layers,
  onToggleLayer,
  onZoomIn,
  onZoomOut,
  onCenterFleet,
  onResetView,
  legendOpen,
  onToggleLegend,
}: OperationalMapControlsProps) {
  return (
    <div className="opmap-controls">
      <div className="opmap-controls__group">
        <button type="button" className="opmap-controls__btn" aria-label="Zoom in" onClick={onZoomIn}>
          <Plus className="size-4" />
        </button>
        <button type="button" className="opmap-controls__btn" aria-label="Zoom out" onClick={onZoomOut}>
          <Minus className="size-4" />
        </button>
        <button type="button" className="opmap-controls__btn" aria-label="Center fleet" onClick={onCenterFleet}>
          <Crosshair className="size-4" />
        </button>
        <button type="button" className="opmap-controls__btn" aria-label="Reset view" onClick={onResetView}>
          <RotateCcw className="size-4" />
        </button>
      </div>

      <details className="opmap-controls__layers" open={legendOpen}>
        <summary
          className="opmap-controls__btn opmap-controls__layers-trigger"
          onClick={(e) => {
            e.preventDefault();
            onToggleLegend();
          }}
        >
          <Layers className="size-4" />
          <span>Layers</span>
        </summary>
        {legendOpen ? (
          <div className="opmap-controls__layers-panel">
            {LAYER_ITEMS.map(({ key, label }) => (
              <label key={key} className="opmap-controls__layer-row">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => onToggleLayer(key)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        ) : null}
      </details>

      <button type="button" className="opmap-controls__btn opmap-controls__legend-btn" onClick={onToggleLegend}>
        <ListTree className="size-4" />
        <span>Legend</span>
      </button>

      <div className="opmap-controls__legend-hint">
        <span className="opmap-legend-dot opmap-legend-dot--teal" />
        Available
        <span className="opmap-legend-dot opmap-legend-dot--amber" />
        Recommendation
        <span className="opmap-legend-dot opmap-legend-dot--red" />
        Critical
        <Target className="size-3 opacity-60" />
        Job
      </div>
    </div>
  );
}
