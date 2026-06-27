import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetDispatchBoardData } from "@/src/types/fleet";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import { createDispatchPerfTimer } from "@/src/lib/fleet/dispatch/perf";
import {
  getCachedDispatchBoard,
  setCachedDispatchBoard,
} from "@/src/lib/fleet/dispatch/board-cache";

export type LoadFleetDispatchCriticalResult = {
  board: FleetDispatchBoardData;
};

/** Critical path only — board snapshot for instant dispatch shell. */
export async function loadFleetDispatchCriticalData(
  supabase: SupabaseClient,
  tenantId: string,
  date: string,
  branchId?: string | null
): Promise<LoadFleetDispatchCriticalResult> {
  const branch = branchId ?? null;
  const cached = getCachedDispatchBoard(tenantId, date, branch);
  if (cached) {
    return { board: cached };
  }

  const perf = createDispatchPerfTimer("dispatch-page-critical");
  const board = await loadFleetDispatchBoardData(supabase, tenantId, date, branchId);
  setCachedDispatchBoard(tenantId, date, branch, board);
  perf.finish();
  return { board };
}
