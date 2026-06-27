-- Dispatch board query performance: tenant + status + schedule window filters

CREATE INDEX IF NOT EXISTS idx_fleet_jobs_dispatch_board
  ON public.fleet_jobs (tenant_id, scheduled_start)
  WHERE status NOT IN ('cancelled', 'completed');

CREATE INDEX IF NOT EXISTS idx_fleet_jobs_tenant_unassigned
  ON public.fleet_jobs (tenant_id, branch_id)
  WHERE status = 'unassigned' OR assigned_truck_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_recommendation_instances_tenant_pending
  ON public.recommendation_instances (tenant_id, status, created_at DESC)
  WHERE status = 'pending';
