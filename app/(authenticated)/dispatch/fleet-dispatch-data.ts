import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetDispatchBoardData, FleetTodayViewData } from "@/src/types/fleet";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import { loadFleetTodayViewData } from "@/src/lib/fleet/queries/today-view";

export type LoadFleetDispatchResult = {
  board: FleetDispatchBoardData;
  intel: FleetTodayViewData;
};

export async function loadFleetDispatchData(
  supabase: SupabaseClient,
  tenantId: string,
  date: string,
  branchId?: string | null
): Promise<LoadFleetDispatchResult> {
  const [board, intel] = await Promise.all([
    loadFleetDispatchBoardData(supabase, tenantId, date, branchId),
    loadFleetTodayViewData(supabase, tenantId),
  ]);
  return { board, intel };
}
