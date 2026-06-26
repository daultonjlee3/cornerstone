"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Map, { type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import {
  FLEET_MAP_DEFAULT_CENTER,
  FLEET_MAP_DEFAULT_ZOOM,
  FLEET_MAP_STYLE,
} from "./constants";
import { useMapboxAccessToken } from "./hooks/useMapboxAccessToken";
import type { FleetMapHandle, FleetMapViewport } from "./types";
import "./fleet-map.css";

type FleetMapProps = {
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  mapStyle?: string;
  children?: ReactNode;
  onLoad?: () => void;
};

const FleetMapViewportContext = createContext<FleetMapViewport>({
  bounds: null,
  zoom: FLEET_MAP_DEFAULT_ZOOM,
});

export function useFleetMapViewport(): FleetMapViewport {
  return useContext(FleetMapViewportContext);
}

export const FleetMap = forwardRef<FleetMapHandle, FleetMapProps>(function FleetMap(
  {
    className = "",
    initialCenter = FLEET_MAP_DEFAULT_CENTER,
    initialZoom = FLEET_MAP_DEFAULT_ZOOM,
    mapStyle = FLEET_MAP_STYLE,
    children,
    onLoad,
  },
  ref
) {
  const mapRef = useRef<MapRef | null>(null);
  const { token, loading, error } = useMapboxAccessToken();
  const [viewport, setViewport] = useState<FleetMapViewport>({
    bounds: null,
    zoom: initialZoom,
  });

  const syncViewport = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    setViewport({
      bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      zoom: map.getZoom(),
    });
  }, []);

  useImperativeHandle(
    ref,
    (): FleetMapHandle => ({
      getMap: () => mapRef.current?.getMap() ?? null,
      zoomIn: () => mapRef.current?.zoomIn(),
      zoomOut: () => mapRef.current?.zoomOut(),
      fitBounds: (bounds, options) => mapRef.current?.fitBounds(bounds, options),
      flyTo: (options) => mapRef.current?.flyTo(options),
      resetNorth: () => mapRef.current?.resetNorthPitch(),
    }),
    []
  );

  const viewportValue = useMemo(() => viewport, [viewport]);

  if (loading) {
    return (
      <div className={`fleet-map fleet-map--loading ${className}`}>
        <p className="fleet-map__status">Loading map…</p>
      </div>
    );
  }

  if (!token || error) {
    return (
      <div className={`fleet-map fleet-map--error ${className}`}>
        <p className="fleet-map__status">{error ?? "Mapbox token required"}</p>
      </div>
    );
  }

  return (
    <FleetMapViewportContext.Provider value={viewportValue}>
      <div className={`fleet-map ${className}`}>
        <Map
          ref={mapRef}
          mapboxAccessToken={token}
          mapStyle={mapStyle}
          initialViewState={{
            longitude: initialCenter[0],
            latitude: initialCenter[1],
            zoom: initialZoom,
          }}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          logoPosition="bottom-left"
          onLoad={() => {
            syncViewport();
            onLoad?.();
          }}
          onMoveEnd={syncViewport}
          onZoomEnd={syncViewport}
        >
          {children}
        </Map>
      </div>
    </FleetMapViewportContext.Provider>
  );
});
