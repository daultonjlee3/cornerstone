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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildFleetDispatchBoardQuery } from "./fleet-dispatch-query";
import { buildDispatchStatusItems, scrollToSection } from "./fleet-dispatch-utils";
import { Skeleton } from "@/src/components/design-system";

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type FleetDispatchViewProps = {
  initialBoard: FleetDispatchBoardData;
  initialIntel: FleetTodayViewData;
  selectedDate: string;
  canManageFleet: boolean;
};

export function FleetDispatchView({
  initialBoard,
  initialIntel,
  selectedDate,
  canManageFleet,
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
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          setRecError(
            payload.error ??
              (action === "accept" ? "Unable to accept recommendation." : "Unable to dismiss.")
          );
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
    <div
      className="relative flex h-[calc(100vh-11rem)] min-h-[620px] flex-col rounded-[var(--radius-xl)] border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/80 p-2 shadow-[var(--elevation-2)]"
      data-testid="fleet-dispatch-board"
    >
      {pending ? (
        <div className="pointer-events-none absolute inset-0 z-50 bg-[color-mix(in_srgb,var(--surface-canvas)_66%,transparent)] px-4 py-4">
          <div className="mx-auto grid max-w-6xl gap-3">
            <Skeleton className="h-14 w-full rounded-[var(--radius-lg)]" />
            <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)_340px]">
              <Skeleton className="h-80 w-full rounded-[var(--radius-lg)]" />
              <Skeleton className="h-80 w-full rounded-[var(--radius-lg)]" />
              <Skeleton className="h-80 w-full rounded-[var(--radius-lg)]" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="shrink-0 space-y-2 rounded-[var(--radius-lg)] border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div>
            <p className="cs-text-micro">Fleet mission control</p>
            <h1 className="cs-text-section-title mt-1">Dispatch Intelligence</h1>
            <p className="text-[11px] text-[var(--muted)]">
              Primary goal: place the right truck on the next highest-value job.
            </p>
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
              className="rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] px-2 py-1 text-sm"
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
        <p className="text-[10px] text-[var(--muted)]">
          Operating date: <span className="font-medium text-[var(--text-muted-strong)]">{selectedDate}</span> ·
          status chips and exception details are tertiary context.
        </p>
      </div>

      {error ? (
        <p className="shrink-0 rounded-md border border-[color-mix(in_srgb,var(--status-danger)_30%,transparent)] bg-[var(--status-danger-subtle)] px-3 py-1.5 text-sm text-[var(--status-danger)]">{error}</p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 pt-3 lg:grid-cols-[320px_minmax(0,1fr)_340px]">
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
            className="min-h-[320px] flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] shadow-[var(--elevation-1)]"
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
            canManageFleet={canManageFleet}
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
