-- Recommendation loop: lifecycle states, measured outcomes, failed apply tracking

-- ---------------------------------------------------------------------------
-- 1) Extend recommendation_instances lifecycle
-- ---------------------------------------------------------------------------
ALTER TABLE public.recommendation_instances
  DROP CONSTRAINT IF EXISTS recommendation_instances_status_check;

ALTER TABLE public.recommendation_instances
  ADD CONSTRAINT recommendation_instances_status_check
  CHECK (status IN (
    'pending',
    'accepted',
    'dismissed',
    'expired',
    'applied',
    'completed',
    'failed'
  ));

COMMENT ON COLUMN public.recommendation_instances.status IS
  'pending → accepted/dismissed/expired; accepted → applied/failed; applied → completed when job finishes';

-- ---------------------------------------------------------------------------
-- 2) Extend recommendation_outcomes actions + measured impact
-- ---------------------------------------------------------------------------
ALTER TABLE public.recommendation_outcomes
  DROP CONSTRAINT IF EXISTS recommendation_outcomes_action_check;

ALTER TABLE public.recommendation_outcomes
  ADD CONSTRAINT recommendation_outcomes_action_check
  CHECK (action IN ('accepted', 'dismissed', 'expired', 'applied', 'failed'));

ALTER TABLE public.recommendation_outcomes
  ADD COLUMN IF NOT EXISTS measured_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS application_error text;

COMMENT ON COLUMN public.recommendation_outcomes.measured_impact IS
  'Observed vs estimated impact after assignment; fields marked pending when actuals unavailable';

COMMENT ON COLUMN public.recommendation_outcomes.application_error IS
  'Human-readable reason when apply/assignment failed';
