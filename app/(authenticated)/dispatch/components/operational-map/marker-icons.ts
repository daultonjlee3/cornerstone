import { divIcon } from "leaflet";
import type { JobVisualState, TruckVisualState } from "./types";

function truckMarkerHtml(state: TruckVisualState, unitNumber: string): string {
  const label = unitNumber.replace(/^#?/, "").slice(0, 4);
  return `<span class="opmap-truck opmap-truck--${state}" data-state="${state}">
    <span class="opmap-truck__ring"></span>
    <span class="opmap-truck__core">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
        <path d="M4 14h1.5a2 2 0 1 0 4 0H10l2-4h5v4h1.5a2 2 0 1 0 4 0H22V9l-2.5-4h-7L10 9H4v5z" stroke-linejoin="round"/>
      </svg>
      <span class="opmap-truck__label">${label}</span>
    </span>
  </span>`;
}

function jobMarkerHtml(state: JobVisualState, priority: string): string {
  const pri = priority === "urgent" || priority === "high" ? priority : "default";
  return `<span class="opmap-job opmap-job--${state} opmap-job--pri-${pri}" data-state="${state}">
    <span class="opmap-job__diamond"></span>
    <span class="opmap-job__icon">◆</span>
  </span>`;
}

function clusterMarkerHtml(count: number, kind: "truck" | "job" | "mixed"): string {
  return `<span class="opmap-cluster opmap-cluster--${kind}">
    <span class="opmap-cluster__count">${count}</span>
  </span>`;
}

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
