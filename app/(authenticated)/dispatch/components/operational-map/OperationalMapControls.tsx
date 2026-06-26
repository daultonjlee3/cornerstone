"use client";

import { useMemo, useState } from "react";
import {
  Crosshair,
  Layers,
  ListTree,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Radio,
  RotateCcw,
  Route,
  Search,
  Target,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

type LayerItem = {
  key: keyof OperationalMapLayers;
  label: string;
  icon: LucideIcon;
};

const LAYER_GROUPS: Array<{ title: string; items: LayerItem[] }> = [
  {
    title: "Fleet",
    items: [
      { key: "trucks", label: "Available trucks", icon: Truck },
      { key: "gpsHealth", label: "GPS health", icon: Radio },
    ],
  },
  {
    title: "Jobs & decisions",
    items: [
      { key: "jobs", label: "Active jobs", icon: MapPin },
      { key: "recommendations", label: "Recommendations", icon: Target },
      { key: "revenueAtRisk", label: "Revenue at risk", icon: Target },
    ],
  },
  {
    title: "Routing",
    items: [
      { key: "routes", label: "Route overlays", icon: Route },
      { key: "deadhead", label: "Deadhead", icon: Navigation },
    ],
  },
  {
    title: "Coverage",
    items: [
      { key: "branches", label: "Branch coverage", icon: Layers },
      { key: "capacity", label: "Capacity", icon: Layers },
    ],
  },
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
  const [layerSearch, setLayerSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const q = layerSearch.trim().toLowerCase();
    if (!q) return LAYER_GROUPS;
    return LAYER_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
    })).filter((group) => group.items.length > 0);
  }, [layerSearch]);

  return (
    <div className="opmap-controls">
      <div className="opmap-controls__group opmap-controls__group--zoom">
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
            <div className="opmap-controls__layers-search">
              <Search className="size-3.5 opacity-50" aria-hidden />
              <input
                type="search"
                value={layerSearch}
                onChange={(e) => setLayerSearch(e.target.value)}
                placeholder="Search layers…"
                className="opmap-controls__layers-search-input"
                aria-label="Search map layers"
              />
            </div>
            {filteredGroups.map((group) => (
              <div key={group.title} className="opmap-controls__layer-group">
                <p className="opmap-controls__layer-group-title">{group.title}</p>
                {group.items.map(({ key, label, icon: Icon }) => (
                  <label key={key} className="opmap-controls__layer-row">
                    <input
                      type="checkbox"
                      className="opmap-controls__layer-checkbox"
                      checked={layers[key]}
                      onChange={() => onToggleLayer(key)}
                    />
                    <span className="opmap-controls__layer-toggle" aria-hidden />
                    <Icon className="size-3.5 shrink-0 opacity-60" aria-hidden />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </details>

      <button
        type="button"
        className="opmap-controls__btn opmap-controls__legend-btn"
        onClick={onToggleLegend}
        aria-pressed={legendOpen}
      >
        <ListTree className="size-4" />
        <span>Legend</span>
      </button>

      <div className="opmap-controls__legend-hint" aria-hidden>
        <span className="opmap-legend-dot opmap-legend-dot--green" />
        Available
        <span className="opmap-legend-dot opmap-legend-dot--blue" />
        Working
        <span className="opmap-legend-dot opmap-legend-dot--amber" />
        Recommendation
        <span className="opmap-legend-dot opmap-legend-dot--red" />
        Critical
      </div>
    </div>
  );
}
