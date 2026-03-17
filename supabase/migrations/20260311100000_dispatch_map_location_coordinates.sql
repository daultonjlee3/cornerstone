-- Dispatch map intelligence: coordinate primitives for routing and map pins

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS current_latitude double precision,
  ADD COLUMN IF NOT EXISTS current_longitude double precision,
  ADD COLUMN IF NOT EXISTS last_location_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_work_orders_coordinates
  ON public.work_orders (company_id, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assets_coordinates
  ON public.assets (company_id, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_buildings_coordinates
  ON public.buildings (property_id, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_coordinates
  ON public.properties (company_id, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_technicians_current_coordinates
  ON public.technicians (company_id, current_latitude, current_longitude)
  WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;
