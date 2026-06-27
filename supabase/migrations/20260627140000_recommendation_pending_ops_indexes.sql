-- Speed up pending recommendation counts and paginated lists on /operations
CREATE INDEX IF NOT EXISTS idx_recommendation_instances_pending_ops
  ON public.recommendation_instances (tenant_id, score DESC, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_recommendation_instances_pending_expires
  ON public.recommendation_instances (tenant_id, expires_at)
  WHERE status = 'pending';
