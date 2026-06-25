"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetRecommendationInstance,
  FleetTodayViewData,
} from "@/src/types/fleet";
import { assignTruckToJob } from "../../fleet/actions";
import { FleetJobQueue } from "./FleetJobQueue";
import { FleetTruckLanes } from "./FleetTruckLanes";
import { FleetCapacityPanel } from "./FleetCapacityPanel";
import { FleetDispatchMapPanel } from "./FleetDispatchMapPanel";
import { FleetDispatchRecommendationsPanel } from "./FleetDispatchRecommendationsPanel";
import { FleetDispatchStatusBar } from "./FleetDispatchStatusBar";
import { FleetDispatchExceptionsStrip } from "./FleetDispatchExceptionsStrip";
import { FleetDispatchOpsContext } from "./FleetDispatchOpsContext";
import { Button } from "@/src/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildFleetDispatchBoardQuery } from "./fleet-dispatch-query";
import { buildDispatchStatusItems, scrollToSection } from "./fleet-dispatch-utils";

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

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
      setRecError(null);
    },
    [searchParams, selectedDate]
  );

  const refreshBoard = useCallback(async () => {
    const branchId = searchParams.get("branch_id");
    const query = buildFleetDispatchBoardQuery(selectedDate, branchId);
    const [boardRes, intelRes] = await Promise.all([
      fetch(`/api/fleet/dispatch-board?${query}`),
      fetch("/api/fleet/today-view"),
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

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

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

  const handleUnassign = useCallback(
    (jobId: string) => {
      setError(null);
      startTransition(async () => {
        const result = await assignTruckToJob(jobId, null);
        if (result.error) {
          setError(result.error);
          return;
        }
        await refreshBoard();
      });
    },
    [refreshBoard]
  );

  const onRecommendationAction = useCallback(
    (id: string, action: "accept" | "dismiss") => {
      startTransition(async () => {
        const res = await fetch(`/api/fleet/recommendations/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          setRecError(action === "accept" ? "Unable to accept recommendation." : "Unable to dismiss.");
          return;
        }
        await refreshBoard();
        await loadRecommendations(true);
        setActiveRecommendation(null);
      });
    },
    [loadRecommendations, refreshBoard]
  );

  const selectedJob: FleetDispatchJob | null =
    board.jobs.find((j) => j.id === selectedJobId) ?? null;

  const statusItems = useMemo(
    () => buildDispatchStatusItems(board, intel, recommendations),
    [board, intel, recommendations]
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

  return (
    <div className="relative flex h-[calc(100vh-8rem)] min-h-[560px] flex-col" data-testid="fleet-dispatch-board">
      {pending ? (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-start justify-center pt-24">
          <div className="flex items-center gap-2 rounded-md border border-[var(--card-border)] bg-white px-3 py-1.5 text-sm shadow-md dark:bg-[var(--card)]">
            <Loader2 className="size-4 animate-spin text-[var(--accent)]" />
            Updating…
          </div>
        </div>
      ) : null}

      {/* Compact header + ops context — above the fold, not dominant */}
      <div className="shrink-0 space-y-1 border-b border-[var(--card-border)] pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div>
            <h1 className="text-base font-semibold text-[var(--foreground)]">Dispatch Intelligence</h1>
            <p className="text-[11px] text-[var(--muted)]">Assign jobs to trucks · {selectedDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label="Previous day"
              onClick={() => navigateDate(shiftDate(selectedDate, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => navigateDate(e.target.value)}
              className="rounded-md border border-[var(--card-border)] bg-white px-2 py-1 text-sm dark:bg-[var(--card)]"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label="Next day"
              onClick={() => navigateDate(shiftDate(selectedDate, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void refreshBoard()} disabled={pending}>
              Refresh
            </Button>
          </div>
        </div>

        <FleetDispatchOpsContext board={board} intel={intel} recommendationCount={recommendations.length} />
        <FleetDispatchStatusBar items={statusItems} />
        <FleetDispatchExceptionsStrip exceptions={intel.exceptions} />
      </div>

      {error ? (
        <p className="shrink-0 border-b border-red-200 bg-white px-3 py-1.5 text-sm text-red-700">{error}</p>
      ) : null}

      {/* Dispatch workspace — primary visual focus */}
      <div className="grid min-h-0 flex-1 gap-2 pt-2 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        <FleetJobQueue
          jobs={board.unassignedJobs}
          board={board}
          selectedJobId={selectedJobId}
          onSelectJob={setSelectedJobId}
          onAssignToTruck={handleAssign}
          truckLanes={board.truckLanes}
          recommendations={recommendations}
          pending={pending}
        />

        <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <div
            id="fleet-dispatch-map"
            className="min-h-[280px] flex-1 overflow-hidden rounded-lg border border-[var(--card-border)] bg-white shadow-sm dark:bg-[var(--card)]"
          >
            <FleetDispatchMapPanel
              jobs={board.jobs}
              truckLanes={board.truckLanes}
              selectedJobId={selectedJobId}
              highlightedTruckId={highlightedTruckId}
              activeRecommendation={activeRecommendation}
              onSelectJob={setSelectedJobId}
            />
          </div>
          <FleetTruckLanes
            lanes={board.truckLanes}
            selectedJob={selectedJob}
            highlightedTruckId={highlightedTruckId}
            recommendations={recommendations}
            onSelectTruck={setHighlightedTruckId}
            onAssign={handleAssign}
            onUnassign={handleUnassign}
            pending={pending}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          <FleetDispatchRecommendationsPanel
            recommendations={recommendations}
            board={board}
            activeRecommendationId={activeRecommendation?.id ?? null}
            pending={pending}
            error={recError}
            onRefresh={() => void loadRecommendations(true)}
            onAccept={(id) => onRecommendationAction(id, "accept")}
            onDismiss={(id) => onRecommendationAction(id, "dismiss")}
            onHighlight={handleHighlightRecommendation}
            onViewMap={handleViewMap}
            onHighlightTruck={setHighlightedTruckId}
            onHighlightJob={setSelectedJobId}
          />
          <FleetCapacityPanel branchCapacity={board.branchCapacity} truckLanes={board.truckLanes} />
        </div>
      </div>
    </div>
  );
}
