"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/mapbox";
import type { FleetMapRouteFeature } from "../types";

type RoutesLayerProps = {
  routes: FleetMapRouteFeature[];
  visible?: boolean;
};

export function RoutesLayer({ routes, visible = true }: RoutesLayerProps) {
  const geojson = useMemo((): GeoJSON.FeatureCollection => {
    return {
      type: "FeatureCollection",
      features: routes.map((route) => ({
        type: "Feature",
        id: route.id,
        properties: {
          primary: route.primary ? 1 : 0,
          dashed: route.dashed ? 1 : 0,
        },
        geometry: {
          type: "LineString",
          coordinates: route.coordinates,
        },
      })),
    };
  }, [routes]);

  if (!visible || routes.length === 0) return null;

  return (
    <Source id="fleet-routes" type="geojson" data={geojson}>
      <Layer
        id="fleet-routes-alt"
        type="line"
        filter={["==", ["get", "primary"], 0]}
        paint={{
          "line-color": "#6e7684",
          "line-width": 3,
          "line-opacity": 0.55,
          "line-dasharray": [2, 2],
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="fleet-routes-primary"
        type="line"
        filter={["==", ["get", "primary"], 1]}
        paint={{
          "line-color": "#2dd4bf",
          "line-width": 4,
          "line-opacity": 0.9,
          "line-dasharray": [2, 2],
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
    </Source>
  );
}
