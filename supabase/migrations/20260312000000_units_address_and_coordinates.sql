-- Units: address and coordinates for dispatch map and location display.
-- Properties and buildings already have address + latitude/longitude (initial schema + 20260311100000).

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE INDEX IF NOT EXISTS idx_units_coordinates
  ON public.units (building_id, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN public.units.address IS 'Street/suite address for the unit; used with building/property address for geocoding.';
COMMENT ON COLUMN public.units.latitude IS 'Latitude for map display and dispatch; fallback when work order has no coords.';
COMMENT ON COLUMN public.units.longitude IS 'Longitude for map display and dispatch; fallback when work order has no coords.';
