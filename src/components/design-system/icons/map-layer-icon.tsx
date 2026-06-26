"use client";

import {
  ArrowRightLeft,
  Building2,
  DollarSign,
  Gauge,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  Route,
  Satellite,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { AppIcon } from "./app-icon";
import type { MapLayerIconProps, MapLayerName } from "./types";

const LAYER_ICONS: Record<MapLayerName, LucideIcon> = {
  trucks: Truck,
  jobs: MapPin,
  recommendations: Sparkles,
  routes: Route,
  branches: Building2,
  capacity: Gauge,
  deadhead: ArrowRightLeft,
  traffic: LayoutDashboard,
  heatmap: LayoutGrid,
  dispatch: LayoutDashboard,
  ai: Sparkles,
  revenue: DollarSign,
  gps: Satellite,
};

/** Lucide-based layer icons — matches app icon stroke/grid (replaces FleetOperationIcon in panels). */
export function MapLayerIcon({ layer, size = "sm", className = "" }: MapLayerIconProps) {
  const Icon = LAYER_ICONS[layer];
  return <AppIcon icon={Icon} size={size} intent="operational" className={className} />;
}

export type { MapLayerName };
