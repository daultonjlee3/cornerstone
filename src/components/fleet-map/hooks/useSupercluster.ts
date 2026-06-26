"use client";

import { useMemo } from "react";
import Supercluster from "supercluster";

type GeoFeature<T> = Supercluster.PointFeature<T>;

export function useSupercluster<T extends Record<string, unknown>>(
  points: Array<{ id: string; longitude: number; latitude: number; properties: T }>,
  bounds: [number, number, number, number] | null,
  zoom: number,
  options?: { radius?: number; maxZoom?: number }
) {
  const index = useMemo(() => {
    const cluster = new Supercluster<T>({
      radius: options?.radius ?? 50,
      maxZoom: options?.maxZoom ?? 16,
    });
    const features: GeoFeature<T>[] = points.map((p) => ({
      type: "Feature",
      properties: { ...p.properties, __id: p.id },
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
    }));
    cluster.load(features);
    return cluster;
  }, [options?.maxZoom, options?.radius, points]);

  return useMemo(() => {
    if (!bounds) return [];
    return index.getClusters(bounds, Math.floor(zoom));
  }, [bounds, index, zoom]);
}
