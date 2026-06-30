"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetRecommendationInstance,
  FleetRecommendationRecalculationNotice,
  FleetTodayViewData,
} from "@/src/types/fleet";
import { FleetDispatchMapPanel } from "./FleetDispatchMapPanel";
import { FleetDispatchRecommendationsPanel } from "./FleetDispatchRecommendationsPanel";
import { FleetDispatchDecisionQueuePanel } from "./FleetDispatchDecisionQueuePanel";
import { FleetDispatchMissionBriefing } from "./FleetDispatchMissionBriefing";
import { FleetDispatchOutlookStrip } from "./FleetDispatchOutlookStrip";
import { CockpitCollapsedRail } from "./CockpitCollapsedRail";
import { FleetDispatchCopilotBridge } from "./FleetDispatchCopilotBridge";
import { useDispatchSecondaryLoad } from "./useDispatchSecondaryLoad";
import { useDispatchMapAssignment } from "./useDispatchMapAssignment";
import { useDebouncedDispatchRefresh } from "./useDebouncedDispatchRefresh";
import { useDispatchKeyboardShortcuts } from "./useDispatchKeyboardShortcuts";
import { DispatchKeyboardHints } from "./DispatchKeyboardHints";
import { buildMinimalDispatchIntel } from "@/src/lib/fleet/dispatch/minimal-intel";
import { applyOptimisticFleetAssignment } from "@/src/lib/fleet/dispatch/optimistic-board";
import { buildFleetDispatchBoardQuery } from "./fleet-dispatch-query";
import { scrollToSection } from "./fleet-dispatch-utils";
import { JobIntelPanel } from "./operational-map/JobIntelPanel";
import { DispatchAssignmentConfirmPanel } from "./operational-map/DispatchAssignmentConfirmPanel";
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

function parseDateParam(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

type FleetDispatchViewProps = {
  initialBoard: FleetDispatchBoardData;
  selectedDate: string;
};

export function FleetDispatchView({
  initialBoard,
  selectedDate,
}: FleetDispatchViewProps) {
  const [activeDate, setActiveDate] = useState(selectedDate);
  const [board, setBoard] = useState(initialBoard);
  const [intel, setIntel] = useState(() => buildMinimalDispatchIntel(initialBoard, selectedDate));
  const [boardLoading, setBoardLoading] = useState(false);
  const dateChangeAbortRef = useRef<AbortController | null>(null);
  const [recommendations, setRecommendations] = useState<FleetRecommendationInstance[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsRefreshing, setRecsRefreshing] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [highlightedTruckId, setHighlightedTruckId] = useState<string | null>(null);
  const [activeRecommendation, setActiveRecommendation] = useState<FleetRecommendationInstance | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const [recalculationNotice, setRecalculationNotice] =
    useState<FleetRecommendationRecalculationNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(true);
  const [decisionOpen, setDecisionOpen] = useState(true);
  const [mapAssignSuccessToken, setMapAssignSuccessToken] = useState(0);
  const [jobSuggestDisplayRec, setJobSuggestDisplayRec] =
    useState<FleetRecommendationInstance | null>(null);
  const [jobSuggestAlternatives, setJobSuggestAlternatives] = useState<
    import("@/src/lib/fleet/dispatch/assignment-service").AssignmentAlternative[]
  >([]);
  const [truckJobAlternatives, setTruckJobAlternatives] = useState<
    Array<{ jobId: string; jobTitle: string; score: number; explanation: string[] }>
  >([]);
  const [bulkDispatching, setBulkDispatching] = useState(false);
  const [pending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  const displayDate = useMemo(() => formatDisplayDate(activeDate), [activeDate]);
  const branchId = searchParams.get("branch_id");
  const isBusy = pending || boardLoading || bulkDispatching;

  const unassignedJobIds = useMemo(
    () => board.unassignedJobs.map((job) => job.id),
    [board.unassignedJobs]
  );

  useDispatchSecondaryLoad({
    board,
    selectedDate: activeDate,
    branchId,
    onIntelUpdate: setIntel,
    onRecommendationsUpdate: (recs, notice, refreshing) => {
      setRecommendations(recs);
      setRecalculationNotice(notice);
      setRecsLoading(false);
      setRecsRefreshing(refreshing);
    },
    onRecError: (message) => {
      setRecError(message);
      setRecsLoading(false);
      setRecsRefreshing(false);
    },
  });

  useEffect(() => {
    const jobId = searchParams.get("job_id")?.trim() || null;
    const truckId = searchParams.get("truck_id")?.trim() || null;

    if (jobId && board.jobs.some((job) => job.id === jobId)) {
      setSelectedJobId(jobId);
      setQueueOpen(true);
    }
    if (truckId && board.truckLanes.some((lane) => lane.truck_id === truckId)) {
      setHighlightedTruckId(truckId);
    }
  }, [board.jobs, board.truckLanes, searchParams]);

  const syncDateInUrl = useCallback((date: string) => {
    const next = new URLSearchParams(window.location.search);
    next.set("date", date);
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `/dispatch?${qs}` : "/dispatch");
  }, []);

  const fetchBoardForDate = useCallback(
    async (date: string, options?: { refresh?: boolean; signal?: AbortSignal }) => {
      const params = new URLSearchParams(buildFleetDispatchBoardQuery(date, branchId));
      if (options?.refresh) params.set("refresh", "true");
      const res = await fetch(`/api/fleet/dispatch-board?${params.toString()}`, {
        cache: "no-store",
        signal: options?.signal,
      });
      if (!res.ok) throw new Error("Unable to load dispatch board.");
      return (await res.json()) as FleetDispatchBoardData;
    },
    [branchId]
  );

  const resetDateChangeUi = useCallback(() => {
    setRecommendations([]);
    setRecsLoading(true);
    setRecsRefreshing(false);
    setSelectedJobId(null);
    setHighlightedTruckId(null);
    setActiveRecommendation(null);
    setJobSuggestDisplayRec(null);
    setRecError(null);
    setRecalculationNotice(null);
  }, []);

  const applyDateChange = useCallback(
    async (date: string) => {
      if (date === activeDate) return;

      dateChangeAbortRef.current?.abort();
      const controller = new AbortController();
      dateChangeAbortRef.current = controller;

      setBoardLoading(true);
      setActiveDate(date);
      syncDateInUrl(date);
      resetDateChangeUi();
      setError(null);

      try {
        const newBoard = await fetchBoardForDate(date, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setBoard(newBoard);
        setIntel(buildMinimalDispatchIntel(newBoard, date));
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "Unable to load dispatch board for selected date.");
        }
      } finally {
        if (!controller.signal.aborted) setBoardLoading(false);
      }
    },
    [activeDate, fetchBoardForDate, resetDateChangeUi, syncDateInUrl]
  );

  const navigateDate = useCallback(
    (date: string) => {
      void applyDateChange(date);
    },
    [applyDateChange]
  );

  useEffect(() => {
    const onPopState = () => {
      const date =
        parseDateParam(new URLSearchParams(window.location.search).get("date")) ?? selectedDate;
      if (date !== activeDate) {
        void applyDateChange(date);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [activeDate, applyDateChange, selectedDate]);

  const loadRecommendations = useCallback(
    async (refresh = false) => {
      const branchId = searchParams.get("branch_id");
      const params = new URLSearchParams();
      params.set("date", activeDate);
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
      setRecsRefreshing(Boolean(payload.refreshing));
      setRecsLoading(false);
      setRecError(null);
      setIntel((prev) => ({
        ...prev,
        recommendations: {
          ...prev.recommendations,
          ...payload,
        },
      }));
    },
    [searchParams, activeDate]
  );

  const refreshBoardOnly = useCallback(async () => {
    try {
      const newBoard = await fetchBoardForDate(activeDate, { refresh: true });
      setBoard(newBoard);
      setIntel((prev) => ({
        ...buildMinimalDispatchIntel(newBoard, activeDate),
        recommendations: prev.recommendations,
        integrationHealth: prev.integrationHealth,
        exceptions: prev.exceptions,
        exceptionCounts: prev.exceptionCounts,
      }));
    } catch {
      setError("Unable to refresh dispatch board.");
    }
  }, [activeDate, fetchBoardForDate]);

  const refreshBoard = useCallback(async () => {
    setBoardLoading(true);
    try {
      await refreshBoardOnly();
      await loadRecommendations(true);
    } finally {
      setBoardLoading(false);
    }
  }, [loadRecommendations, refreshBoardOnly]);

  const afterAssignmentRefresh = useCallback(async () => {
    await refreshBoardOnly();
    void loadRecommendations(true);
    setSelectedJobId(null);
    setHighlightedTruckId(null);
    setActiveRecommendation(null);
    setJobSuggestDisplayRec(null);
    setMapAssignSuccessToken((t) => t + 1);
  }, [loadRecommendations, refreshBoardOnly]);

  const handleOptimisticAssign = useCallback((truckId: string, jobId: string) => {
    setBoard((prev) => applyOptimisticFleetAssignment(prev, truckId, jobId));
    setRecommendations((prev) =>
      prev.filter((rec) => rec.rationale.entities.job_id !== jobId)
    );
    setMapAssignSuccessToken((t) => t + 1);
  }, []);

  const assignment = useDispatchMapAssignment({
    selectedDate: activeDate,
    branchId,
    onAssigned: afterAssignmentRefresh,
    onOptimisticAssign: handleOptimisticAssign,
  });

  const handleAssign = useCallback(
    (jobId: string, truckId: string) => {
      setError(null);
      void assignment.validatePair(truckId, jobId).then((validation) => {
        if (!validation?.valid) return;
        void assignment.commitAssignment({
          truckId,
          jobId,
          validationId: validation.validationId,
          snapshotId: validation.snapshotId,
          assignmentSource: "map_click",
        });
      });
    },
    [assignment]
  );

  const onRecommendationAction = useCallback(
    (id: string, action: "accept" | "dismiss", optimistic = true) => {
      const rec = recommendations.find((item) => item.id === id);
      if (optimistic && action === "accept" && rec) {
        const jobId = rec.rationale.entities.job_id;
        const truckId =
          rec.rationale.candidates?.[0]?.truck_id ?? rec.rationale.entities.truck_id;
        if (jobId && truckId) {
          handleOptimisticAssign(truckId, jobId);
        }
        setRecommendations((prev) => prev.filter((item) => item.id !== id));
        setActiveRecommendation(null);
      }

      startTransition(async () => {
        setRecError(null);
        const res = await fetch(`/api/fleet/recommendations/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: activeDate }),
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
          if (optimistic && action === "accept") {
            await refreshBoard();
          }
          return;
        }
        void refreshBoardOnly();
        void loadRecommendations(true);
        setActiveRecommendation(null);
        setRecError(null);
      });
    },
    [
      activeDate,
      handleOptimisticAssign,
      loadRecommendations,
      recommendations,
      refreshBoard,
      refreshBoardOnly,
    ]
  );

  const onBulkAcceptRecommendations = useCallback(async () => {
    if (recommendations.length === 0 || bulkDispatching) return;
    setBulkDispatching(true);
    const batch = recommendations.slice(0, 8);
    for (const rec of batch) {
      onRecommendationAction(rec.id, "accept", true);
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    setBulkDispatching(false);
  }, [bulkDispatching, onRecommendationAction, recommendations]);

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

  const isUnassignedJob = useCallback(
    (job: FleetDispatchJob) => job.status === "unassigned" || !job.assigned_truck_id,
    []
  );

  const handleMapJobClick = useCallback(
    async (jobId: string | null) => {
      if (!jobId) {
        setSelectedJobId(null);
        setJobSuggestDisplayRec(null);
        return;
      }
      const job = board.jobs.find((item) => item.id === jobId);
      if (!job) return;

      setSelectedJobId(jobId);
      setHighlightedTruckId(null);

      if (!isUnassignedJob(job)) return;

      const result = await assignment.suggestForJob(jobId);
      if (!result) return;

      setJobSuggestAlternatives(result.alternatives);
      const displayRec = result.displayRecommendation ?? result.recommendation;
      if (displayRec) {
        setJobSuggestDisplayRec(displayRec);
        handleHighlightRecommendation(displayRec);
        setDecisionOpen(true);
      }
    },
    [assignment, board.jobs, handleHighlightRecommendation, isUnassignedJob]
  );

  const handleMapTruckClick = useCallback(
    async (truckId: string | null) => {
      setHighlightedTruckId(truckId);
      if (!truckId) {
        setTruckJobAlternatives([]);
        return;
      }
      const result = await assignment.suggestForTruck(truckId);
      if (!result) return;
      setTruckJobAlternatives(
        result.alternatives
          .filter((alt) => alt.jobId && alt.jobTitle)
          .map((alt) => ({
            jobId: alt.jobId as string,
            jobTitle: alt.jobTitle as string,
            score: alt.score,
            explanation: alt.explanation,
          }))
      );
      if (result.displayRecommendation) {
        handleHighlightRecommendation(result.displayRecommendation);
      }
    },
    [assignment, handleHighlightRecommendation]
  );

  const handleTruckDropOnJob = useCallback(
    (truckId: string, jobId: string) => {
      setHighlightedTruckId(truckId);
      setSelectedJobId(jobId);
      void assignment.validatePair(truckId, jobId, assignment.suggestResult?.snapshotId);
    },
    [assignment]
  );

  const handleConfirmAssignment = useCallback(() => {
    const validation = assignment.validation;
    if (!validation?.valid) return;
    const recommendationId =
      assignment.suggestResult?.recommendation?.id ??
      jobSuggestDisplayRec?.id ??
      activeRecommendation?.id ??
      null;
    void assignment.commitAssignment({
      truckId: validation.truckId,
      jobId: validation.jobId,
      validationId: validation.validationId,
      snapshotId: validation.snapshotId,
      assignmentSource:
        assignment.panelMode === "confirm" && jobSuggestDisplayRec
          ? "ai_recommendation"
          : "manual_drag",
      recommendationId,
    });
  }, [activeRecommendation?.id, assignment, jobSuggestDisplayRec]);

  const selectedJob = selectedJobId
    ? board.jobs.find((job) => job.id === selectedJobId) ?? null
    : null;

  const showJobIntel =
    selectedJob &&
    isUnassignedJob(selectedJob) &&
    jobSuggestDisplayRec &&
    assignment.panelMode === "idle";

  const assignmentToasts = (
    <div className="opmap-toast-stack" aria-live="polite">
      {assignment.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`opmap-toast opmap-toast--${toast.variant}`}
          role="status"
        >
          {toast.message}
          <button type="button" onClick={() => assignment.dismissToast(toast.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );

  const { subscribe: subscribeDispatchSignals } = useDebouncedDispatchRefresh({
    onRefreshBoard: refreshBoardOnly,
    onRefreshRecommendations: () => loadRecommendations(true),
  });

  useDispatchKeyboardShortcuts({
    recommendations,
    activeRecommendationId: activeRecommendation?.id ?? null,
    panelMode: assignment.panelMode,
    selectedJobId,
    unassignedJobIds,
    onAcceptRecommendation: (id) => onRecommendationAction(id, "accept"),
    onDismissRecommendation: (id) => onRecommendationAction(id, "dismiss", false),
    onConfirmAssignment: handleConfirmAssignment,
    onCancelPanel: () => {
      assignment.dismissPanel();
      setJobSuggestDisplayRec(null);
    },
    onSelectJob: (id) => {
      void handleMapJobClick(id);
    },
    onHighlightRecommendation: handleHighlightRecommendation,
    onBulkAcceptRecommendations: () => void onBulkAcceptRecommendations(),
    onRefresh: () => void refreshBoard(),
  });

  useEffect(() => subscribeDispatchSignals(), [subscribeDispatchSignals]);

  return (
    <div className="dispatch-console" data-testid="fleet-dispatch-board">
      <FleetDispatchCopilotBridge
        activeRecommendation={activeRecommendation}
        branchId={searchParams.get("branch_id")}
      />
      {boardLoading && !pending ? (
        <div className="dispatch-console__sync-indicator" aria-live="polite">
          Syncing board…
        </div>
      ) : null}
      <DispatchKeyboardHints
        recommendationCount={recommendations.length}
        unassignedCount={board.unassignedJobs.length}
      />

      <FleetDispatchMissionBriefing
        board={board}
        intel={intel}
        recommendationCount={recommendations.length}
        recommendations={recommendations}
        selectedDate={activeDate}
        displayDate={displayDate}
        pending={isBusy}
        onPrevDay={() => navigateDate(shiftDate(activeDate, -1))}
        onNextDay={() => navigateDate(shiftDate(activeDate, 1))}
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
              pending={isBusy}
              recommendationsLoading={recsLoading}
              recommendationsRefreshing={recsRefreshing}
              error={recError}
              recalculationNotice={recalculationNotice}
              recommendationSummary={intel.recommendations.summary}
              trustMetrics={intel.recommendations.trustMetrics}
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
            className={`dispatch-console__map-cell ${activeRecommendation ? "dispatch-console__map-cell--active" : ""} ${mapAssignSuccessToken > 0 ? "dispatch-console__map-cell--assigned" : ""}`}
            data-assign-flash={mapAssignSuccessToken}
          >
            <FleetDispatchMapPanel
              jobs={board.jobs}
              truckLanes={board.truckLanes}
              branchCapacity={board.branchCapacity}
              recommendations={recommendations}
              selectedJobId={selectedJobId}
              highlightedTruckId={highlightedTruckId}
              activeRecommendation={activeRecommendation}
              onSelectJob={handleMapJobClick}
              onSelectTruck={handleMapTruckClick}
              onTruckDropOnJob={handleTruckDropOnJob}
              onTruckDragCancel={assignment.dismissPanel}
              truckJobAlternatives={truckJobAlternatives}
              mapAssignSuccessToken={mapAssignSuccessToken}
              assignmentToasts={assignmentToasts}
              jobIntelPanel={
                showJobIntel && selectedJob && jobSuggestDisplayRec ? (
                  <JobIntelPanel
                    job={selectedJob}
                    displayRecommendation={jobSuggestDisplayRec}
                    alternatives={jobSuggestAlternatives}
                    onClose={() => {
                      setSelectedJobId(null);
                      setJobSuggestDisplayRec(null);
                    }}
                    onAccept={() => {
                      const truckId =
                        jobSuggestDisplayRec.rationale.candidates?.[0]?.truck_id ??
                        jobSuggestDisplayRec.rationale.entities.truck_id;
                      if (!truckId) return;
                      void assignment.validatePair(truckId, selectedJob.id).then((validation) => {
                        if (validation?.valid) {
                          void assignment.commitAssignment({
                            truckId,
                            jobId: selectedJob.id,
                            validationId: validation.validationId,
                            snapshotId: validation.snapshotId,
                            assignmentSource: "ai_recommendation",
                            recommendationId: assignment.suggestResult?.recommendation?.id ?? null,
                          });
                        }
                      });
                    }}
                    onSelectTruck={(truckId) => {
                      setHighlightedTruckId(truckId);
                      void assignment.validatePair(truckId, selectedJob.id);
                    }}
                    onViewAlternatives={() => setDecisionOpen(true)}
                    onReject={() => {
                      setJobSuggestDisplayRec(null);
                      handleHighlightRecommendation(null);
                    }}
                    pending={assignment.committing}
                  />
                ) : null
              }
              assignmentPanel={
                <DispatchAssignmentConfirmPanel
                  mode={assignment.panelMode}
                  validation={assignment.validation}
                  committing={assignment.committing}
                  onConfirm={handleConfirmAssignment}
                  onCancel={assignment.dismissPanel}
                  onCompareAlternatives={() => setDecisionOpen(true)}
                />
              }
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
              pending={isBusy}
              onSelectJob={(id) => void handleMapJobClick(id)}
              onAssignToTruck={handleAssign}
              onAcceptRecommendation={(id) => onRecommendationAction(id, "accept")}
              onBulkAcceptRecommendations={() => void onBulkAcceptRecommendations()}
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
