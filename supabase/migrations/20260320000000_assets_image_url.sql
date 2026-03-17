-- Optional equipment image URL for assets (e.g. category-level demo images from Pexels).
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.assets.image_url IS 'Optional URL to an equipment/category image (e.g. from Pexels for demo seeding).';
