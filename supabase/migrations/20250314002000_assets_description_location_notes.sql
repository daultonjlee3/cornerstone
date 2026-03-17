-- Align assets table with frontend fields used in assets pages/forms.

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS location_notes text;
