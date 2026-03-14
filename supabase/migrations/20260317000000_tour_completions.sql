-- Tour completion tracking for guided onboarding tours (per user, per tour).
-- Enables first-time tours and "Restart tour" from settings.

CREATE TABLE IF NOT EXISTS public.tour_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  tour_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tour_id)
);

CREATE INDEX IF NOT EXISTS idx_tour_completions_user_id ON public.tour_completions (user_id);

COMMENT ON TABLE public.tour_completions IS 'Per-user completion state for onboarding tours; delete row to restart a tour.';

-- RLS: users can only read/insert/update/delete their own rows
ALTER TABLE public.tour_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tour_completions_select_own
  ON public.tour_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY tour_completions_insert_own
  ON public.tour_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY tour_completions_update_own
  ON public.tour_completions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY tour_completions_delete_own
  ON public.tour_completions FOR DELETE
  USING (auth.uid() = user_id);
