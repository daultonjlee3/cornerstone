"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { buildFleetDispatchBoardQuery } from "./fleet-dispatch-query";
import { buildDispatchStatusItems, scrollToSection } from "./fleet-dispatch-utils";
import { HeroPanel, Skeleton } from "@/src/components/design-system";

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
    <div className="dispatch-mission" data-testid="fleet-dispatch-board">
      {pending ? (
        <div className="pointer-events-none fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--surface-canvas)_55%,transparent)] backdrop-blur-[1px]">
          <div className="mx-auto flex h-full max-w-7xl flex-col justify-center gap-4 p-6">
            <Skeleton className="h-28 w-full rounded-[var(--radius-xl)]" />
            <div className="grid gap-4 lg:grid-cols-[minmax(17.5rem,22%)_minmax(0,1fr)_minmax(18.75rem,26%)]">
              <Skeleton className="h-[32rem] w-full rounded-[var(--radius-xl)]" />
              <Skeleton className="h-[32rem] w-full rounded-[var(--radius-xl)]" />
              <Skeleton className="h-[32rem] w-full rounded-[var(--radius-xl)]" />
            </div>
          </div>
        </div>
      ) : null}

      <HeroPanel id="fleet-dispatch-hero" className="space-y-6">
        <div className="dispatch-mission__header">
          <div className="min-w-0">
            <p className="cs-text-eyebrow text-[var(--brand-operational)]">Fleet Command Center</p>
            <h1 className="dispatch-mission__title mt-2">Dispatch Intelligence</h1>
            <p className="dispatch-mission__tagline">
              Place the right truck on the highest-value job.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label="Previous day"
              onClick={() => navigateDate(shiftDate(selectedDate, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="rounded-[var(--radius-md)] border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium tabular-nums">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => navigateDate(e.target.value)}
                className="border-0 bg-transparent p-0 text-sm font-medium tabular-nums text-[var(--text-primary)] outline-none"
                aria-label="Select operating date"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label="Next day"
              onClick={() => navigateDate(shiftDate(selectedDate, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void refreshBoard()}
              disabled={pending}
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${pending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <FleetDispatchOpsContext
          board={board}
          intel={intel}
          recommendationCount={recommendations.length}
        />

        <FleetDispatchStatusBar items={statusItems} />

        <FleetDispatchExceptionsStrip exceptions={intel.exceptions} />
      </HeroPanel>

      {error ? (
        <p className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--status-danger)_30%,transparent)] bg-[var(--status-danger-subtle)] px-4 py-2.5 text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}

      <div className="dispatch-mission__workspace min-h-[640px] flex-1 pb-2">
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

        <div className="dispatch-mission__map-column">
          <div id="fleet-dispatch-map" className="dispatch-mission__map-shell">
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

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
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
