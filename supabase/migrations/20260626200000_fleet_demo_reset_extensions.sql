-- Extend fleet demo reset for operator PTO/hours and dispatch signals

CREATE OR REPLACE FUNCTION public.reset_fleet_demo_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id required';
  END IF;

  ALTER TABLE public.telematics_events DISABLE TRIGGER trg_telematics_events_no_delete;

  DELETE FROM public.recommendation_outcomes
  WHERE recommendation_id IN (
    SELECT id FROM public.recommendation_instances WHERE tenant_id = p_tenant_id
  );

  DELETE FROM public.recommendation_instances WHERE tenant_id = p_tenant_id;
  DELETE FROM public.utilization_daily WHERE tenant_id = p_tenant_id;
  DELETE FROM public.branch_capacity_snapshots WHERE tenant_id = p_tenant_id;
  DELETE FROM public.telematics_events WHERE tenant_id = p_tenant_id;
  DELETE FROM public.fleet_jobs WHERE tenant_id = p_tenant_id;
  DELETE FROM public.external_entity_mappings WHERE tenant_id = p_tenant_id;
  DELETE FROM public.integration_sync_runs WHERE tenant_id = p_tenant_id;
  DELETE FROM public.integration_connections WHERE tenant_id = p_tenant_id;
  DELETE FROM public.fleet_operator_time_off WHERE tenant_id = p_tenant_id;
  DELETE FROM public.fleet_operator_hours_daily WHERE tenant_id = p_tenant_id;
  DELETE FROM public.fleet_dispatch_signals WHERE tenant_id = p_tenant_id;
  DELETE FROM public.fleet_operators WHERE tenant_id = p_tenant_id;
  DELETE FROM public.trucks WHERE tenant_id = p_tenant_id;
  DELETE FROM public.customer_sites WHERE tenant_id = p_tenant_id;
  DELETE FROM public.branches WHERE tenant_id = p_tenant_id;

  DELETE FROM public.customers
  WHERE company_id IN (SELECT id FROM public.companies WHERE tenant_id = p_tenant_id);

  ALTER TABLE public.telematics_events ENABLE TRIGGER trg_telematics_events_no_delete;
EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.telematics_events ENABLE TRIGGER trg_telematics_events_no_delete;
  RAISE;
END;
$$;
