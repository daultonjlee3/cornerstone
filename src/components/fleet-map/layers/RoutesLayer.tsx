"use client";

import { useMemo } from "react";
import { Layer, Marker, Source } from "react-map-gl/mapbox";
import type { FleetMapRouteFeature } from "../types";
import { midpoint } from "../utils/bearing";

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
          recommendation: route.recommendation ? 1 : 0,
          animated: route.animated ? 1 : 0,
        },
        geometry: {
          type: "LineString",
          coordinates: route.coordinates,
        },
      })),
    };
  }, [routes]);

  const labels = useMemo(
    () =>
      routes
        .filter((r) => r.label && r.coordinates.length >= 2)
        .map((r) => ({
          id: r.id,
          position: midpoint(r.coordinates[0], r.coordinates[r.coordinates.length - 1]),
          label: r.label as string,
          recommendation: Boolean(r.recommendation),
        })),
    [routes]
  );

  if (!visible || routes.length === 0) return null;

  return (
    <>
      <Source id="fleet-routes" type="geojson" data={geojson}>
        <Layer
          id="fleet-routes-alt"
          type="line"
          filter={["all", ["==", ["get", "primary"], 0], ["==", ["get", "recommendation"], 0]]}
          paint={{
            "line-color": "#6e7684",
            "line-width": 2.5,
            "line-opacity": 0.5,
            "line-dasharray": [2, 2],
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
        <Layer
          id="fleet-routes-selection"
          type="line"
          filter={["all", ["==", ["get", "primary"], 1], ["==", ["get", "recommendation"], 0]]}
          paint={{
            "line-color": "#2dd4bf",
            "line-width": 3.5,
            "line-opacity": 0.85,
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
        <Layer
          id="fleet-routes-recommendation-glow"
          type="line"
          filter={["==", ["get", "recommendation"], 1]}
          paint={{
            "line-color": "#2dd4bf",
            "line-width": 8,
            "line-opacity": 0.22,
            "line-blur": 2,
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
        <Layer
          id="fleet-routes-recommendation"
          type="line"
          filter={["==", ["get", "recommendation"], 1]}
          paint={{
            "line-color": "#2dd4bf",
            "line-width": 4,
            "line-opacity": 0.95,
            "line-dasharray": [1.5, 1.25],
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
      </Source>

      {labels.map(({ id, position, label, recommendation }) => (
        <Marker key={`route-label-${id}`} longitude={position[0]} latitude={position[1]} anchor="center">
          <span
            className={`opmap-route-label ${recommendation ? "opmap-route-label--rec" : ""}`}
            aria-hidden
          >
            {label}
          </span>
        </Marker>
      ))}
    </>
  );
}
