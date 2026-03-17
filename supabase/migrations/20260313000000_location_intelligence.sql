-- Location Intelligence: resolve work order coordinates from hierarchy (asset → unit → building → property).
-- Ensures every work order has resolvable map location for dispatch.

-- ---------------------------------------------------------------------------
-- 1) Function: resolve work_orders.latitude/longitude from location hierarchy
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_work_order_coordinates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res_lat double precision := NULL;
  res_lon double precision := NULL;
  a_lat double precision;
  a_lon double precision;
  u_lat double precision;
  u_lon double precision;
  b_lat double precision;
  b_lon double precision;
  p_lat double precision;
  p_lon double precision;
BEGIN
  -- Already have coordinates: keep them
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 2) Asset coordinates
  IF NEW.asset_id IS NOT NULL THEN
    SELECT a.latitude, a.longitude INTO a_lat, a_lon
    FROM public.assets a
    WHERE a.id = NEW.asset_id AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
    LIMIT 1;
    IF a_lat IS NOT NULL AND a_lon IS NOT NULL THEN
      res_lat := a_lat;
      res_lon := a_lon;
    END IF;
  END IF;

  -- 3) Unit coordinates
  IF res_lat IS NULL AND NEW.unit_id IS NOT NULL THEN
    SELECT u.latitude, u.longitude INTO u_lat, u_lon
    FROM public.units u
    WHERE u.id = NEW.unit_id AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
    LIMIT 1;
    IF u_lat IS NOT NULL AND u_lon IS NOT NULL THEN
      res_lat := u_lat;
      res_lon := u_lon;
    END IF;
  END IF;

  -- 4) Building coordinates
  IF res_lat IS NULL AND NEW.building_id IS NOT NULL THEN
    SELECT b.latitude, b.longitude INTO b_lat, b_lon
    FROM public.buildings b
    WHERE b.id = NEW.building_id AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
    LIMIT 1;
    IF b_lat IS NOT NULL AND b_lon IS NOT NULL THEN
      res_lat := b_lat;
      res_lon := b_lon;
    END IF;
  END IF;

  -- 5) Property coordinates
  IF res_lat IS NULL AND NEW.property_id IS NOT NULL THEN
    SELECT p.latitude, p.longitude INTO p_lat, p_lon
    FROM public.properties p
    WHERE p.id = NEW.property_id AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    LIMIT 1;
    IF p_lat IS NOT NULL AND p_lon IS NOT NULL THEN
      res_lat := p_lat;
      res_lon := p_lon;
    END IF;
  END IF;

  IF res_lat IS NOT NULL AND res_lon IS NOT NULL THEN
    NEW.latitude := res_lat;
    NEW.longitude := res_lon;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resolve_work_order_coordinates_trigger ON public.work_orders;
CREATE TRIGGER resolve_work_order_coordinates_trigger
  BEFORE INSERT OR UPDATE OF property_id, building_id, unit_id, asset_id, latitude, longitude
  ON public.work_orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.resolve_work_order_coordinates();

COMMENT ON FUNCTION public.resolve_work_order_coordinates() IS
  'Resolves work_orders.latitude/longitude from asset → unit → building → property for dispatch map.';

-- One-time backfill: resolve coordinates for existing work orders (trigger runs on UPDATE OF property_id)
UPDATE public.work_orders wo
SET property_id = wo.property_id
WHERE wo.latitude IS NULL AND wo.longitude IS NULL
  AND (wo.property_id IS NOT NULL OR wo.building_id IS NOT NULL OR wo.unit_id IS NOT NULL OR wo.asset_id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 2) Ensure properties have full address fields (already added in prior migrations; add any missing)
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS zip text;

-- Backfill address_line1 from address if still null
UPDATE public.properties SET address_line1 = address WHERE address_line1 IS NULL AND address IS NOT NULL;
UPDATE public.properties SET zip = postal_code WHERE zip IS NULL AND postal_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) Indexes for location resolution and dispatch (if not already present)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_work_orders_location_hierarchy
  ON public.work_orders (company_id, property_id, building_id, unit_id, asset_id);

CREATE INDEX IF NOT EXISTS idx_assets_location_hierarchy
  ON public.assets (company_id, property_id, building_id, unit_id)
  WHERE property_id IS NOT NULL OR building_id IS NOT NULL OR unit_id IS NOT NULL;
