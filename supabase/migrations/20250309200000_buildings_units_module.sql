-- Buildings module: add tenant_id and building_name, building_code, status, year_built, floors, square_feet, notes
-- Table public.buildings already exists (property_id, name, ...).

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS building_name text,
  ADD COLUMN IF NOT EXISTS building_code text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS year_built int,
  ADD COLUMN IF NOT EXISTS floors int,
  ADD COLUMN IF NOT EXISTS square_feet numeric(12, 2),
  ADD COLUMN IF NOT EXISTS notes text;

-- Backfill tenant_id from property -> company
UPDATE public.buildings b
SET tenant_id = c.tenant_id
FROM public.properties p
JOIN public.companies c ON c.id = p.company_id
WHERE b.property_id = p.id AND b.tenant_id IS NULL;

UPDATE public.buildings SET building_name = name WHERE building_name IS NULL AND name IS NOT NULL;
UPDATE public.buildings SET status = 'active' WHERE status IS NULL;
ALTER TABLE public.buildings ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.buildings ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.buildings DROP CONSTRAINT IF EXISTS chk_buildings_status;
ALTER TABLE public.buildings ADD CONSTRAINT chk_buildings_status CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_buildings_tenant_id ON public.buildings (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buildings_status ON public.buildings (tenant_id, status) WHERE tenant_id IS NOT NULL;

-- Units module: add tenant_id, unit_name, unit_code, square_feet, occupancy_type, status
-- Table public.units already exists (building_id, property_id, name_or_number, floor, square_footage, notes).

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS unit_name text,
  ADD COLUMN IF NOT EXISTS unit_code text,
  ADD COLUMN IF NOT EXISTS square_feet numeric(12, 2),
  ADD COLUMN IF NOT EXISTS occupancy_type text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Backfill tenant_id from building -> property -> company
UPDATE public.units u
SET tenant_id = c.tenant_id
FROM public.buildings b
JOIN public.properties p ON p.id = b.property_id
JOIN public.companies c ON c.id = p.company_id
WHERE u.building_id = b.id AND u.tenant_id IS NULL;

-- Units with property_id but no building_id (if any)
UPDATE public.units u
SET tenant_id = c.tenant_id
FROM public.properties p
JOIN public.companies c ON c.id = p.company_id
WHERE u.property_id = p.id AND u.tenant_id IS NULL AND u.building_id IS NULL;

UPDATE public.units SET unit_name = name_or_number WHERE unit_name IS NULL AND name_or_number IS NOT NULL;
UPDATE public.units SET square_feet = square_footage WHERE square_feet IS NULL AND square_footage IS NOT NULL;
UPDATE public.units SET status = 'active' WHERE status IS NULL;
ALTER TABLE public.units ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.units ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.units DROP CONSTRAINT IF EXISTS chk_units_status;
ALTER TABLE public.units ADD CONSTRAINT chk_units_status CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_units_tenant_id ON public.units (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units (tenant_id, status) WHERE tenant_id IS NOT NULL;
