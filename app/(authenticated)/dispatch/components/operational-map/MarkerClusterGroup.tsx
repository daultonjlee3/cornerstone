"use client";

import {
  createElementObject,
  createLayerComponent,
  extendContext,
  type LayerProps,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import L from "leaflet";
import "leaflet.markercluster";
import type { PropsWithChildren } from "react";
import { createClusterMarkerIcon } from "./marker-icons";

export type MarkerClusterGroupProps = L.MarkerClusterGroupOptions & LayerProps & PropsWithChildren;

function createMarkerClusterGroup(props: MarkerClusterGroupProps, context: LeafletContextInterface) {
  const { children: _children, ...options } = props;
  const instance = new L.MarkerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 56,
    animate: true,
    animateAddingMarkers: false,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount();
      return createClusterMarkerIcon(count, "truck");
    },
    ...options,
  });
  return createElementObject(instance, extendContext(context, { layerContainer: instance }));
}

export const MarkerClusterGroup = createLayerComponent<L.MarkerClusterGroup, MarkerClusterGroupProps>(
  createMarkerClusterGroup
);
