import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetDispatchBoardData } from "@/src/types/fleet";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";

export type LoadFleetDispatchResult = {
  board: FleetDispatchBoardData;
};

export async function loadFleetDispatchData(
  supabase: SupabaseClient,
  tenantId: string,
  date: string,
  branchId?: string | null
): Promise<LoadFleetDispatchResult> {
  const board = await loadFleetDispatchBoardData(supabase, tenantId, date, branchId);
  return { board };
}
