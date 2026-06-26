/**
 * Fleet Intelligence Copilot — structured operational data retrieval.
 * Tenant-scoped; does not modify recommendation engine logic.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadFleetCommandCenterData } from "@/src/lib/fleet/queries/command-center";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import { loadFleetTodayViewData } from "@/src/lib/fleet/queries/today-view";
import { getFleetRecommendations } from "@/src/lib/fleet-recommendation-engine/service";
import type { CornerstoneAiContext } from "./types";

export type RetrievedFleetOpsContext = {
  commandCenter?: Awaited<ReturnType<typeof loadFleetCommandCenterData>>;
  todayView?: Awaited<ReturnType<typeof loadFleetTodayViewData>>;
  dispatchBoard?: Awaited<ReturnType<typeof loadFleetDispatchBoardData>>;
  recommendations?: Awaited<ReturnType<typeof getFleetRecommendations>>;
  selectedRecommendation?: import("./types").FleetCopilotRecommendationSnapshot;
  dataGaps: string[];
};

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

type FleetQuerySignals = {
  wantsDispatch: boolean;
  wantsFleetStatus: boolean;
  wantsRevenue: boolean;
  wantsDeadhead: boolean;
  wantsExceptions: boolean;
  wantsIntegrations: boolean;
  wantsRecommendations: boolean;
};

function classifyFleetQuerySignals(query: string): FleetQuerySignals {
  const q = query.toLowerCase();
  return {
    wantsDispatch:
      /\b(recommend|assign|unassigned|dispatch|reject|accept|confidence|impact)\b/.test(q),
    wantsFleetStatus:
      /\b(truck|idle|unavailable|offline|stale|gps|operator|capacity|branch)\b/.test(q),
    wantsRevenue:
      /\b(revenue|contribution|margin|profit|at risk|opportunity)\b/.test(q),
    wantsDeadhead:
      /\b(deadhead|route|routing|travel|mile|inefficient)\b/.test(q),
    wantsExceptions:
      /\b(exception|blocker|attention|ready|expired|unhealthy|issue|late)\b/.test(q),
    wantsIntegrations:
      /\b(integration|sync|samsara|connected|missing data|telematics|webhook)\b/.test(q),
    wantsRecommendations:
      /\b(recommend|why is|why was|pt-|truck recommended)\b/.test(q),
  };
}

function mergeSignals(signals: FleetQuerySignals, hasSelectedRec: boolean): FleetQuerySignals {
  if (!hasSelectedRec) return signals;
  return {
    ...signals,
    wantsDispatch: true,
    wantsRecommendations: true,
    wantsDeadhead: signals.wantsDeadhead || true,
  };
}

export async function retrieveFleetOpsContext(
  supabase: SupabaseClient,
  tenantId: string,
  query: string,
  context?: CornerstoneAiContext
): Promise<RetrievedFleetOpsContext> {
  const today = todayDateOnly();
  const hasSelectedRec = Boolean(context?.fleet?.selectedRecommendation?.id);
  const signals = mergeSignals(classifyFleetQuerySignals(query), hasSelectedRec);
  const dataGaps: string[] = [];
  const result: RetrievedFleetOpsContext = { dataGaps };

  if (context?.fleet?.selectedRecommendation) {
    result.selectedRecommendation = context.fleet.selectedRecommendation;
  }

  const needsCommandCenter =
    signals.wantsRevenue ||
    signals.wantsFleetStatus ||
    signals.wantsExceptions ||
    !Object.values(signals).some(Boolean);

  const needsTodayView =
    signals.wantsExceptions ||
    signals.wantsIntegrations ||
    signals.wantsRecommendations ||
    signals.wantsRevenue;

  const needsDispatch =
    signals.wantsDispatch ||
    signals.wantsFleetStatus ||
    signals.wantsDeadhead ||
    signals.wantsExceptions;

  const needsRecommendations =
    signals.wantsDispatch ||
    signals.wantsRecommendations ||
    hasSelectedRec;

  try {
    if (needsCommandCenter) {
      result.commandCenter = await loadFleetCommandCenterData(supabase, tenantId);
    }
  } catch {
    dataGaps.push("command_center");
  }

  try {
    if (needsTodayView) {
      result.todayView = await loadFleetTodayViewData(supabase, tenantId, { date: today });
    }
  } catch {
    dataGaps.push("today_view");
  }

  try {
    if (needsDispatch) {
      result.dispatchBoard = await loadFleetDispatchBoardData(supabase, tenantId, today);
    }
  } catch {
    dataGaps.push("dispatch_board");
  }

  try {
    if (needsRecommendations) {
      result.recommendations = await getFleetRecommendations(supabase, tenantId, {
        date: today,
        branchId: context?.fleet?.branchId ?? null,
      });
    }
  } catch {
    dataGaps.push("recommendations");
  }

  if (
    !result.commandCenter &&
    !result.todayView &&
    !result.dispatchBoard &&
    !result.recommendations &&
    !result.selectedRecommendation
  ) {
    dataGaps.push("no_operational_data");
  }

  return result;
}
