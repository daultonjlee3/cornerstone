"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/mapbox";
import { circlePolygon } from "../utils/geo";
import type { FleetMapBranchZone } from "../types";

type BranchZonesLayerProps = {
  zones: FleetMapBranchZone[];
  showCapacity?: boolean;
  visible?: boolean;
};

export function BranchZonesLayer({
  zones,
  showCapacity = true,
  visible = true,
}: BranchZonesLayerProps) {
  const geojson = useMemo((): GeoJSON.FeatureCollection => {
    return {
      type: "FeatureCollection",
      features: zones.map((zone) => ({
        type: "Feature",
        id: zone.id,
        properties: {
          hot: zone.utilization >= 0.85 ? 1 : 0,
        },
        geometry: circlePolygon(zone.longitude, zone.latitude, zone.radiusMeters),
      })),
    };
  }, [zones]);

  if (!visible || zones.length === 0) return null;

  return (
    <Source id="fleet-branch-zones" type="geojson" data={geojson}>
      <Layer
        id="fleet-branch-zones-fill"
        type="fill"
        paint={{
          "fill-color": [
            "case",
            ["==", ["get", "hot"], 1],
            "rgba(251, 146, 60, 0.03)",
            "rgba(45, 212, 191, 0.03)",
          ],
          "fill-opacity": showCapacity ? 0.35 : 0.2,
        }}
      />
      <Layer
        id="fleet-branch-zones-outline"
        type="line"
        paint={{
          "line-color": [
            "case",
            ["==", ["get", "hot"], 1],
            "rgba(251, 146, 60, 0.22)",
            "rgba(45, 212, 191, 0.18)",
          ],
          "line-width": 1,
        }}
      />
    </Source>
  );
}
