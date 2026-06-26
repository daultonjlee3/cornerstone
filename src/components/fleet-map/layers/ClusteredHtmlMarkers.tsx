"use client";

import { memo } from "react";
import { Marker } from "react-map-gl/mapbox";

import { useFleetMapViewport } from "../FleetMap";
import { useSupercluster } from "../hooks/useSupercluster";
import { clusterMarkerHtml } from "../markers/html-markers";

type ClusteredHtmlMarkersProps<T extends Record<string, unknown>> = {
  points: Array<{ id: string; longitude: number; latitude: number; properties: T }>;
  kind: "truck" | "job";
  renderPointHtml: (properties: T) => string;
  onPointClick: (id: string) => void;
  onClusterClick?: (longitude: number, latitude: number) => void;
  getOpacity?: (properties: T) => number;
  clusterRadius?: number;
};

function ClusteredHtmlMarkersInner<T extends Record<string, unknown>>({
  points,
  kind,
  renderPointHtml,
  onPointClick,
  onClusterClick,
  getOpacity,
  clusterRadius,
}: ClusteredHtmlMarkersProps<T>) {
  const { bounds, zoom } = useFleetMapViewport();
  const clusters = useSupercluster(points, bounds, zoom, {
    radius: clusterRadius ?? (kind === "job" ? 48 : 50),
  });

  return (
    <>
      {clusters.map((feature) => {
        const [longitude, latitude] = feature.geometry.coordinates as [number, number];
        const props = feature.properties as T & {
          cluster?: boolean;
          cluster_id?: number;
          point_count?: number;
          __id?: string;
        };

        if (props.cluster) {
          const count = props.point_count ?? 0;
          return (
            <Marker
              key={`cluster-${kind}-${props.cluster_id}`}
              longitude={longitude}
              latitude={latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onClusterClick?.(longitude, latitude);
              }}
            >
              <div
                className="fleet-map-marker fleet-map-marker--cluster opmap-marker-shell"
                dangerouslySetInnerHTML={{ __html: clusterMarkerHtml(count, kind) }}
              />
            </Marker>
          );
        }

        const id = props.__id as string;
        const opacity = getOpacity ? getOpacity(props) : 1;
        return (
          <Marker
            key={`${kind}-${id}`}
            longitude={longitude}
            latitude={latitude}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onPointClick(id);
            }}
          >
            <div
              className="fleet-map-marker opmap-marker-shell"
              style={{ opacity }}
              dangerouslySetInnerHTML={{ __html: renderPointHtml(props) }}
            />
          </Marker>
        );
      })}
    </>
  );
}

export const ClusteredHtmlMarkers = memo(
  ClusteredHtmlMarkersInner
) as typeof ClusteredHtmlMarkersInner;
