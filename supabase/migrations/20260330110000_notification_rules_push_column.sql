-- Align notification_rules with policy layer resolution (push channel).
ALTER TABLE public.notification_rules
  ADD COLUMN IF NOT EXISTS push boolean;

COMMENT ON COLUMN public.notification_rules.push IS 'NULL = inherit from company / event type defaults; used when push delivery is implemented.';
