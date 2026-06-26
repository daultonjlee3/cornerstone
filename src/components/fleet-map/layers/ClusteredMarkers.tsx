"use client";

import { memo, type ReactNode } from "react";
import { Marker } from "react-map-gl/mapbox";

import { FleetCluster } from "@/src/components/fleet/icons";
import { useFleetMapViewport } from "../FleetMap";
import type { AnimatedPosition } from "../hooks/useAnimatedPositions";
import { useSupercluster } from "../hooks/useSupercluster";

export type ClusterPoint<T extends Record<string, unknown>> = {
  id: string;
  longitude: number;
  latitude: number;
  properties: T;
};

type ClusteredMarkersProps<T extends Record<string, unknown>> = {
  points: ClusterPoint<T>[];
  kind: "truck" | "job";
  renderPoint: (properties: T, meta?: { bearing: number | null }) => ReactNode;
  onPointClick: (id: string) => void;
  onClusterClick?: (longitude: number, latitude: number) => void;
  getOpacity?: (properties: T) => number;
  clusterRadius?: number;
  /** When provided, markers use interpolated coordinates from telemetry updates. */
  animatedPositions?: Map<string, AnimatedPosition>;
};

function ClusteredMarkersInner<T extends Record<string, unknown>>({
  points,
  kind,
  renderPoint,
  onPointClick,
  onClusterClick,
  getOpacity,
  clusterRadius,
  animatedPositions,
}: ClusteredMarkersProps<T>) {
  const { bounds, zoom } = useFleetMapViewport();

  const displayPoints = points.map((point) => {
    const anim = animatedPositions?.get(point.id);
    if (!anim) return point;
    return {
      ...point,
      longitude: anim.longitude,
      latitude: anim.latitude,
    };
  });

  const clusters = useSupercluster(displayPoints, bounds, zoom, {
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
              <div className="fleet-map-marker fleet-map-marker--cluster opmap-marker-shell">
                <FleetCluster count={count} kind={kind} size="md" />
              </div>
            </Marker>
          );
        }

        const id = props.__id as string;
        const opacity = getOpacity ? getOpacity(props) : 1;
        const { __id: _id, cluster: _c, cluster_id: _ci, point_count: _pc, ...cleanProps } = props;
        const anim = animatedPositions?.get(id);

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
            <div className="fleet-map-marker opmap-marker-shell" style={{ opacity }}>
              {renderPoint(cleanProps as T, anim ? { bearing: anim.bearing } : undefined)}
            </div>
          </Marker>
        );
      })}
    </>
  );
}

export const ClusteredMarkers = memo(ClusteredMarkersInner) as typeof ClusteredMarkersInner;
