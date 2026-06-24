"use client";

import type { FleetDispatchJob, FleetDispatchTruckLane } from "@/src/types/fleet";
import { Button } from "@/src/components/ui/button";

type FleetTruckLanesProps = {
  lanes: FleetDispatchTruckLane[];
  selectedJob: FleetDispatchJob | null;
  onAssign: (jobId: string, truckId: string) => void;
  onUnassign: (jobId: string) => void;
  pending?: boolean;
};

function barTone(utilization: number): string {
  if (utilization >= 1) return "bg-red-500";
  if (utilization >= 0.8) return "bg-amber-500";
  return "bg-emerald-500";
}

export function FleetTruckLanes({
  lanes,
  selectedJob,
  onAssign,
  onUnassign,
  pending,
}: FleetTruckLanesProps) {
  return (
    <div className="max-h-[200px] overflow-x-auto overflow-y-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)]/30 p-2">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Truck lanes
      </p>
      <div className="flex gap-2">
        {lanes.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No trucks configured.</p>
        ) : (
          lanes.map((lane) => (
            <div
              key={lane.truck_id}
              className="w-44 shrink-0 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/60 p-2"
            >
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-sm font-semibold">{lane.unit_number}</p>
                <span
                  className={`rounded px-1 text-[9px] font-medium uppercase ${
                    lane.telematics_status === "online"
                      ? "bg-emerald-100 text-emerald-800"
                      : lane.telematics_status === "stale"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {lane.telematics_status}
                </span>
              </div>
              <p className="text-[10px] text-[var(--muted)]">{lane.truck_type}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`h-full ${barTone(lane.utilization)}`}
                  style={{ width: `${Math.min(100, Math.max(6, lane.utilization * 100))}%` }}
                />
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                {lane.committed_hours.toFixed(1)} / {lane.available_hours.toFixed(1)}h
              </p>
              <ul className="mt-2 space-y-1">
                {lane.jobs.map((job) => (
                  <li
                    key={job.id}
                    className="rounded border border-[var(--card-border)]/60 px-1.5 py-1 text-[10px]"
                  >
                    <p className="truncate font-medium">{job.title}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-1 h-6 w-full text-[9px]"
                      disabled={pending}
                      onClick={() => onUnassign(job.id)}
                    >
                      Unassign
                    </Button>
                  </li>
                ))}
              </ul>
              {selectedJob ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-2 w-full text-[10px]"
                  disabled={pending}
                  onClick={() => onAssign(selectedJob.id, lane.truck_id)}
                >
                  Assign selected
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
