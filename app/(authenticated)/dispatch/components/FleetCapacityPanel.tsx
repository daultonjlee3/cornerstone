"use client";

import type { FleetDispatchTruckLane } from "@/src/types/fleet";
import { WorkloadPanel } from "./WorkloadPanel";

type FleetCapacityPanelProps = {
  branchCapacity: Array<{
    branch_id: string;
    branch_name: string;
    available_truck_hours: number;
    committed_hours: number;
    utilization: number;
  }>;
  truckLanes: FleetDispatchTruckLane[];
};

function barTone(utilization: number): string {
  if (utilization >= 1) return "bg-red-500";
  if (utilization >= 0.8) return "bg-amber-500";
  return "bg-emerald-500";
}

function textTone(utilization: number): string {
  if (utilization >= 1) return "text-red-700";
  if (utilization >= 0.8) return "text-amber-700";
  return "text-emerald-700";
}

export function FleetCapacityPanel({ branchCapacity, truckLanes }: FleetCapacityPanelProps) {
  const overloadedTrucks = truckLanes.filter((lane) => lane.utilization >= 0.8);

  return (
    <aside className="flex flex-col gap-3 overflow-y-auto">
      <WorkloadPanel title="Branch capacity" description="Committed vs available truck hours (mart).">
        <div className="space-y-1.5">
          {branchCapacity.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No capacity snapshot for this date.</p>
          ) : (
            branchCapacity.map((branch) => (
              <div
                key={branch.branch_id}
                className="rounded border border-[var(--card-border)]/60 bg-[var(--background)]/50 p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{branch.branch_name}</p>
                  <p className={`text-xs font-semibold ${textTone(branch.utilization)}`}>
                    {branch.committed_hours.toFixed(1)} / {branch.available_truck_hours.toFixed(1)}h
                  </p>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className={`h-full ${barTone(branch.utilization)}`}
                    style={{ width: `${Math.min(100, Math.max(6, branch.utilization * 100))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </WorkloadPanel>

      <WorkloadPanel title="Truck capacity" description="Per-truck committed hours today.">
        <div className="space-y-1.5">
          {truckLanes.slice(0, 8).map((lane) => (
            <div
              key={lane.truck_id}
              className="rounded border border-[var(--card-border)]/60 bg-[var(--background)]/50 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{lane.unit_number}</p>
                <p className={`text-xs font-semibold ${textTone(lane.utilization)}`}>
                  {(lane.utilization * 100).toFixed(0)}%
                </p>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`h-full ${barTone(lane.utilization)}`}
                  style={{ width: `${Math.min(100, Math.max(6, lane.utilization * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </WorkloadPanel>

      {overloadedTrucks.length > 0 ? (
        <WorkloadPanel title="Alerts" description="Trucks at or above 80% capacity.">
          <ul className="space-y-1 text-xs text-amber-800">
            {overloadedTrucks.map((lane) => (
              <li key={lane.truck_id}>
                {lane.unit_number} at {(lane.utilization * 100).toFixed(0)}% capacity
              </li>
            ))}
          </ul>
        </WorkloadPanel>
      ) : null}
    </aside>
  );
}
