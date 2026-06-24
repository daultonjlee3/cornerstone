"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FleetDispatchBoardData, FleetDispatchJob } from "@/src/types/fleet";
import { assignTruckToJob } from "../../fleet/actions";
import { FleetJobQueue } from "./FleetJobQueue";
import { FleetTruckLanes } from "./FleetTruckLanes";
import { FleetCapacityPanel } from "./FleetCapacityPanel";
import { FleetDispatchMapPanel } from "./FleetDispatchMapPanel";
import { FleetDispatchRecommendationsPanel } from "./FleetDispatchRecommendationsPanel";
import { Button } from "@/src/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildFleetDispatchBoardQuery } from "./fleet-dispatch-query";

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type FleetDispatchViewProps = {
  initialBoard: FleetDispatchBoardData;
  selectedDate: string;
};

export function FleetDispatchView({ initialBoard, selectedDate }: FleetDispatchViewProps) {
  const [board, setBoard] = useState(initialBoard);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
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

  const refreshBoard = useCallback(async () => {
    const branchId = searchParams.get("branch_id");
    const query = buildFleetDispatchBoardQuery(selectedDate, branchId);
    const res = await fetch(`/api/fleet/dispatch-board?${query}`);
    if (!res.ok) return;
    const data = (await res.json()) as FleetDispatchBoardData;
    setBoard(data);
  }, [searchParams, selectedDate]);

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

  const selectedJob: FleetDispatchJob | null =
    board.jobs.find((j) => j.id === selectedJobId) ?? null;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] flex-col gap-3" data-testid="fleet-dispatch-board">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Dispatch Intelligence Board</h1>
          <p className="text-sm text-[var(--muted)]">
            Assign jobs to trucks — deadhead miles are estimated (Haversine heuristic).
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
            className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-sm"
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

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
        <FleetJobQueue
          jobs={board.unassignedJobs}
          selectedJobId={selectedJobId}
          onSelectJob={setSelectedJobId}
          onAssignToTruck={handleAssign}
          truckLanes={board.truckLanes}
          pending={pending}
        />

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="min-h-[220px] flex-1 overflow-hidden rounded-lg border border-[var(--card-border)]">
            <FleetDispatchMapPanel
              jobs={board.jobs}
              truckLanes={board.truckLanes}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
            />
          </div>
          <FleetTruckLanes
            lanes={board.truckLanes}
            selectedJob={selectedJob}
            onAssign={handleAssign}
            onUnassign={handleUnassign}
            pending={pending}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <FleetCapacityPanel branchCapacity={board.branchCapacity} truckLanes={board.truckLanes} />
          <FleetDispatchRecommendationsPanel
            selectedDate={selectedDate}
            branchId={searchParams.get("branch_id")}
            onRecommendationApplied={refreshBoard}
          />
        </div>
      </div>
    </div>
  );
}
