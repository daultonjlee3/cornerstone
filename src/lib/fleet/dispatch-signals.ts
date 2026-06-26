import type { SupabaseClient } from "@supabase/supabase-js";

export type FleetDispatchSignalType =
  | "recommendations_invalidated"
  | "telematics_updated"
  | "jobs_updated"
  | "board_refresh";

export async function publishDispatchSignal(
  supabase: SupabaseClient,
  tenantId: string,
  signalType: FleetDispatchSignalType,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("fleet_dispatch_signals").insert({
    tenant_id: tenantId,
    signal_type: signalType,
    payload,
  });
  if (error) {
    console.error("[fleet-dispatch-signals] failed to publish", error.message);
  }
}

export async function listDispatchSignalsSince(
  supabase: SupabaseClient,
  tenantId: string,
  sinceIso: string
): Promise<
  Array<{
    id: string;
    signal_type: FleetDispatchSignalType;
    payload: Record<string, unknown>;
    created_at: string;
  }>
> {
  const { data, error } = await supabase
    .from("fleet_dispatch_signals")
    .select("id, signal_type, payload, created_at")
    .eq("tenant_id", tenantId)
    .gt("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    id: string;
    signal_type: FleetDispatchSignalType;
    payload: Record<string, unknown>;
    created_at: string;
  }>;
}
