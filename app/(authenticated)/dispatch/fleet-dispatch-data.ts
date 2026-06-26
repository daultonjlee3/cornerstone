import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetDispatchBoardData, FleetTodayViewData } from "@/src/types/fleet";
import { getFleetRecommendations } from "@/src/lib/fleet-recommendation-engine/service";
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
  // Load board first, then recommendations — never run getFleetRecommendations in parallel
  // with loadFleetTodayViewData (race on insert crashes /dispatch).
  const board = await loadFleetDispatchBoardData(supabase, tenantId, date, branchId);
  const recommendations = await getFleetRecommendations(supabase, tenantId, { date, branchId });
  const intel = await loadFleetTodayViewData(supabase, tenantId, {
    date,
    board,
    recommendations,
  });

  return { board, intel };
}
