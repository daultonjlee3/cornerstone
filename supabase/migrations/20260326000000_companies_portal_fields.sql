-- Companies portal fields for public maintenance request portals
-- - Reuse existing companies.slug as the public portal slug
-- - portal_enabled: when true, company may expose a public /request/[slug] portal

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_name text,
  ADD COLUMN IF NOT EXISTS allow_public_requests boolean NOT NULL DEFAULT true;

