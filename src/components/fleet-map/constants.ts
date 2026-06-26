/** Default Atlanta metro — fleet demo centroid */
export const FLEET_MAP_DEFAULT_CENTER: [number, number] = [-84.55, 33.95];

export const FLEET_MAP_DEFAULT_ZOOM = 8;

/** Enterprise dark basemap — minimal clutter, high contrast */
export const FLEET_MAP_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";

/** Satellite imagery with street labels */
export const FLEET_MAP_STYLE_SATELLITE = "mapbox://styles/mapbox/satellite-streets-v12";

export const FLEET_MAP_STYLE = FLEET_MAP_STYLE_DARK;

export const FLEET_MAP_FIT_PADDING = { top: 40, bottom: 40, left: 48, right: 48 } as const;

export const FLEET_MAP_MAX_FIT_ZOOM = 12;
