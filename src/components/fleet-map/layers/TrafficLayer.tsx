"use client";

import { Layer, Source } from "react-map-gl/mapbox";

type TrafficLayerProps = {
  visible?: boolean;
};

export function TrafficLayer({ visible = true }: TrafficLayerProps) {
  if (!visible) return null;

  return (
    <Source id="fleet-mapbox-traffic" type="vector" url="mapbox://mapbox.mapbox-traffic-v1">
      <Layer
        id="fleet-traffic-lines"
        type="line"
        source-layer="traffic"
        paint={{
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 2, 18, 4],
          "line-color": [
            "match",
            ["get", "congestion"],
            "low",
            "#42c75a",
            "moderate",
            "#fbb03b",
            "heavy",
            "#e55e5e",
            "severe",
            "#8b2346",
            "#42c75a",
          ],
        }}
      />
    </Source>
  );
}
