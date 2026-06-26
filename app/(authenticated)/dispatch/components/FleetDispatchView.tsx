"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  FleetDispatchBoardData,
  FleetRecommendationInstance,
  FleetRecommendationRecalculationNotice,
  FleetTodayViewData,
} from "@/src/types/fleet";
import { assignTruckToJob } from "../../fleet/actions";
import { FleetDispatchMapPanel } from "./FleetDispatchMapPanel";
import { FleetDispatchRecommendationsPanel } from "./FleetDispatchRecommendationsPanel";
import { FleetDispatchDecisionQueuePanel } from "./FleetDispatchDecisionQueuePanel";
import { FleetDispatchMissionBriefing } from "./FleetDispatchMissionBriefing";
import { FleetDispatchOutlookStrip } from "./FleetDispatchOutlookStrip";
import { CockpitCollapsedRail } from "./CockpitCollapsedRail";
import { FleetDispatchCopilotBridge } from "./FleetDispatchCopilotBridge";
import { buildFleetDispatchBoardQuery } from "./fleet-dispatch-query";
import { scrollToSection } from "./fleet-dispatch-utils";
import { FleetMissionControlLoader } from "@/src/components/fleet-intelligence/FleetMissionControlLoader";
import "./dispatch-console.css";

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

type FleetDispatchViewProps = {
  initialBoard: FleetDispatchBoardData;
  initialIntel: FleetTodayViewData;
  selectedDate: string;
};

export function FleetDispatchView({
  initialBoard,
  initialIntel,
  selectedDate,
}: FleetDispatchViewProps) {
  const [board, setBoard] = useState(initialBoard);
  const [intel, setIntel] = useState(initialIntel);
  const [recommendations, setRecommendations] = useState<FleetRecommendationInstance[]>(
    initialIntel.recommendations.pending
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [highlightedTruckId, setHighlightedTruckId] = useState<string | null>(null);
  const [activeRecommendation, setActiveRecommendation] = useState<FleetRecommendationInstance | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const [recalculationNotice, setRecalculationNotice] =
    useState<FleetRecommendationRecalculationNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(true);
  const [decisionOpen, setDecisionOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const displayDate = useMemo(() => formatDisplayDate(selectedDate), [selectedDate]);

  const navigateDate = useCallback(
    (date: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("date", date);
      router.push(`/dispatch?${next.toString()}`);
    },
    [router, searchParams]
  );

  const loadRecommendations = useCallback(
    async (refresh = false) => {
      const branchId = searchParams.get("branch_id");
      const params = new URLSearchParams();
      params.set("date", selectedDate);
      if (branchId?.trim()) params.set("branch_id", branchId.trim());
      if (refresh) params.set("refresh", "true");
      const res = await fetch(`/api/fleet/recommendations?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        setRecError("Unable to load recommendations.");
        return;
      }
      const payload = await res.json();
      setRecommendations(payload.pending ?? []);
      setRecalculationNotice(payload.recalculationNotice ?? null);
      setRecError(null);
    },
    [searchParams, selectedDate]
  );

  const refreshBoard = useCallback(async () => {
    const branchId = searchParams.get("branch_id");
    const query = buildFleetDispatchBoardQuery(selectedDate, branchId);
    const [boardRes, intelRes] = await Promise.all([
      fetch(`/api/fleet/dispatch-board?${query}`),
      fetch(`/api/fleet/today-view?date=${encodeURIComponent(selectedDate)}`),
    ]);
    if (boardRes.ok) {
      setBoard((await boardRes.json()) as FleetDispatchBoardData);
    }
    if (intelRes.ok) {
      const intelPayload = (await intelRes.json()) as FleetTodayViewData;
      setIntel(intelPayload);
      setRecommendations(intelPayload.recommendations.pending);
    } else {
      await loadRecommendations();
    }
  }, [loadRecommendations, searchParams, selectedDate]);

  const handleAssign = useCallback(
    (jobId: string, truckId: string) => {
      setError(null);
      startTransition(async () => {
        const result = await assignTruckToJob(jobId, truckId);
        if (result.error) {
          setError(result.error);
          return;
        }
        await refreshBoard();
        setSelectedJobId(null);
        setHighlightedTruckId(null);
        setActiveRecommendation(null);
      });
    },
    [refreshBoard]
  );

  const onRecommendationAction = useCallback(
    (id: string, action: "accept" | "dismiss") => {
      startTransition(async () => {
        setRecError(null);
        const res = await fetch(`/api/fleet/recommendations/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate }),
        });
        if (!res.ok) {
          let message =
            action === "accept" ? "Unable to accept recommendation." : "Unable to dismiss.";
          try {
            const payload = (await res.json()) as { error?: string };
            if (payload.error) message = payload.error;
          } catch {
            // keep default message
          }
          if (res.status === 403) {
            message = "You do not have permission to manage fleet recommendations.";
          }
          setRecError(message);
          return;
        }
        await refreshBoard();
        await loadRecommendations(true);
        setActiveRecommendation(null);
        setRecError(null);
      });
    },
    [loadRecommendations, refreshBoard, selectedDate]
  );

  const handleHighlightRecommendation = useCallback((rec: FleetRecommendationInstance | null) => {
    setActiveRecommendation(rec);
    if (rec) {
      const truckId = rec.rationale.candidates?.[0]?.truck_id ?? rec.rationale.entities.truck_id ?? null;
      const jobId = rec.rationale.entities.job_id ?? null;
      setHighlightedTruckId(truckId);
      if (jobId) setSelectedJobId(jobId);
    } else {
      setHighlightedTruckId(null);
    }
  }, []);

  const handleViewMap = useCallback(
    (rec: FleetRecommendationInstance) => {
      handleHighlightRecommendation(rec);
      scrollToSection("fleet-dispatch-map");
    },
    [handleHighlightRecommendation]
  );

  useEffect(() => {
    const source = new EventSource("/api/fleet/dispatch-board/stream");
    const refreshOnSignal = () => {
      void refreshBoard();
      void loadRecommendations(true);
    };

    source.addEventListener("recommendations_invalidated", refreshOnSignal);
    source.addEventListener("telematics_updated", refreshOnSignal);
    source.addEventListener("jobs_updated", refreshOnSignal);

    return () => {
      source.close();
    };
  }, [loadRecommendations, refreshBoard]);

  return (
    <div className="dispatch-console" data-testid="fleet-dispatch-board">
      <FleetDispatchCopilotBridge
        activeRecommendation={activeRecommendation}
        branchId={searchParams.get("branch_id")}
      />
      {pending ? (
        <div className="dispatch-console__loading">
          <FleetMissionControlLoader
            variant="overlay"
            testId="fleet-dispatch-refresh-loading"
            messages={[
              "Refreshing dispatch board…",
              "Updating recommendations…",
              "Syncing telematics…",
            ]}
          />
        </div>
      ) : null}

      <FleetDispatchMissionBriefing
        board={board}
        intel={intel}
        recommendationCount={recommendations.length}
        recommendations={recommendations}
        selectedDate={selectedDate}
        displayDate={displayDate}
        pending={pending}
        onPrevDay={() => navigateDate(shiftDate(selectedDate, -1))}
        onNextDay={() => navigateDate(shiftDate(selectedDate, 1))}
        onDateChange={navigateDate}
        onRefresh={() => void refreshBoard()}
      />

      <div
        className="dispatch-console__cockpit"
        data-decision-open={decisionOpen}
        data-queue-open={queueOpen}
      >
        <div className="dispatch-console__rail-slot dispatch-console__rail-slot--left">
          {decisionOpen ? (
            <FleetDispatchRecommendationsPanel
              layout="cockpit"
              recommendations={recommendations}
              board={board}
              activeRecommendationId={activeRecommendation?.id ?? null}
              pending={pending}
              error={recError}
              recalculationNotice={recalculationNotice}
              onRefresh={() => void loadRecommendations(true)}
              onAccept={(id) => onRecommendationAction(id, "accept")}
              onDismiss={(id) => onRecommendationAction(id, "dismiss")}
              onHighlight={handleHighlightRecommendation}
              onViewMap={handleViewMap}
              onHighlightTruck={setHighlightedTruckId}
              onHighlightJob={setSelectedJobId}
              onCollapse={() => setDecisionOpen(false)}
            />
          ) : (
            <CockpitCollapsedRail
              side="left"
              label="Decision"
              count={recommendations.length}
              accent
              onExpand={() => setDecisionOpen(true)}
            />
          )}
        </div>

        <main className="dispatch-console__major">
          <div
            id="fleet-dispatch-map"
            className={`dispatch-console__map-cell ${activeRecommendation ? "dispatch-console__map-cell--active" : ""}`}
          >
            <FleetDispatchMapPanel
              jobs={board.jobs}
              truckLanes={board.truckLanes}
              branchCapacity={board.branchCapacity}
              recommendations={recommendations}
              selectedJobId={selectedJobId}
              highlightedTruckId={highlightedTruckId}
              activeRecommendation={activeRecommendation}
              onSelectJob={setSelectedJobId}
              onSelectTruck={setHighlightedTruckId}
            />
          </div>
          <FleetDispatchOutlookStrip board={board} intel={intel} recommendations={recommendations} />
        </main>

        <div className="dispatch-console__rail-slot dispatch-console__rail-slot--right">
          {queueOpen ? (
            <FleetDispatchDecisionQueuePanel
              recommendations={recommendations}
              exceptions={intel.exceptions}
              jobs={board.unassignedJobs}
              board={board}
              selectedJobId={selectedJobId}
              activeRecommendationId={activeRecommendation?.id ?? null}
              pending={pending}
              onSelectJob={setSelectedJobId}
              onAssignToTruck={handleAssign}
              truckLanes={board.truckLanes}
              onHighlightRecommendation={handleHighlightRecommendation}
              onCollapse={() => setQueueOpen(false)}
            />
          ) : (
            <CockpitCollapsedRail
              side="right"
              label="Queue"
              count={board.unassignedJobs.length + recommendations.length}
              onExpand={() => setQueueOpen(true)}
            />
          )}
        </div>
      </div>

      {error ? <p className="dispatch-console__error">{error}</p> : null}
    </div>
  );
}
