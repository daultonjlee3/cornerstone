"use client";

import type { FleetDispatchJob, FleetDispatchTruckLane } from "@/src/types/fleet";
import { Button } from "@/src/components/ui/button";
import { PriorityBadge } from "@/src/components/ui/priority-badge";

type FleetJobQueueProps = {
  jobs: FleetDispatchJob[];
  selectedJobId: string | null;
  onSelectJob: (id: string | null) => void;
  onAssignToTruck: (jobId: string, truckId: string) => void;
  truckLanes: FleetDispatchTruckLane[];
  pending?: boolean;
};

export function FleetJobQueue({
  jobs,
  selectedJobId,
  onSelectJob,
  onAssignToTruck,
  truckLanes,
  pending,
}: FleetJobQueueProps) {
  return (
    <aside className="flex flex-col overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)]/40">
      <div className="border-b border-[var(--card-border)] px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Job queue</p>
        <p className="text-[10px] text-[var(--muted)]">{jobs.length} unassigned</p>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto p-2">
        {jobs.length === 0 ? (
          <li className="px-2 py-4 text-center text-xs text-[var(--muted)]">No unassigned jobs today.</li>
        ) : (
          jobs.map((job) => {
            const selected = selectedJobId === job.id;
            return (
              <li
                key={job.id}
                className={`rounded-lg border p-2 text-sm ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : "border-[var(--card-border)] bg-[var(--background)]/50"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelectJob(selected ? null : job.id)}
                >
                  <p className="font-semibold text-[var(--foreground)]">{job.title}</p>
                  <p className="text-xs text-[var(--muted)]">{job.site_name ?? "Site"} · {job.required_truck_type}</p>
                  {job.estimated_deadhead_miles != null ? (
                    <p className="mt-1 text-[10px] text-amber-700">
                      Est. deadhead: {job.estimated_deadhead_miles.toFixed(1)} mi
                      {job.estimated_travel_minutes != null
                        ? ` · ~${job.estimated_travel_minutes} min`
                        : ""}
                    </p>
                  ) : null}
                  <div className="mt-1">
                    <PriorityBadge priority={job.priority} />
                  </div>
                </button>
                {selected ? (
                  <div className="mt-2 space-y-1 border-t border-[var(--card-border)] pt-2">
                    <p className="text-[10px] font-medium text-[var(--muted)]">Assign to truck</p>
                    {truckLanes
                      .filter((lane) => lane.truck_type === job.required_truck_type || job.required_truck_type === "any")
                      .slice(0, 6)
                      .map((lane) => (
                        <Button
                          key={lane.truck_id}
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="w-full justify-start text-[11px]"
                          disabled={pending}
                          onClick={() => onAssignToTruck(job.id, lane.truck_id)}
                        >
                          {lane.unit_number}
                        </Button>
                      ))}
                  </div>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
