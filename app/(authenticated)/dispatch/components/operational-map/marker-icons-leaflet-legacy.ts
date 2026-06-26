/** @deprecated Leaflet-only helpers — retained until CMMS DispatchMapPanel migrates */
import { divIcon } from "leaflet";
import type { JobVisualState, TruckVisualState } from "./types";
import { clusterMarkerHtml, jobMarkerHtml, truckMarkerHtml } from "@/src/components/fleet-map/markers/html-markers";

export function createTruckMarkerIcon(state: TruckVisualState, unitNumber: string) {
  const size = state === "selected" || state === "recommended" ? 48 : 42;
  return divIcon({
    className: "opmap-marker-shell",
    html: truckMarkerHtml(state, unitNumber),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createJobMarkerIcon(state: JobVisualState, priority: string) {
  const size = state === "selected" || state === "recommended" || state === "risk" ? 36 : 30;
  return divIcon({
    className: "opmap-marker-shell",
    html: jobMarkerHtml(state, priority),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createClusterMarkerIcon(count: number, kind: "truck" | "job" | "mixed") {
  const size = count > 99 ? 52 : count > 9 ? 46 : 40;
  return divIcon({
    className: "opmap-marker-shell",
    html: clusterMarkerHtml(count, kind),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
