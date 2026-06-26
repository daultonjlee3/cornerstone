"use client";

import type { FleetDispatchTruckLane } from "@/src/types/fleet";

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
  if (utilization >= 1) return "bg-[var(--status-danger)]";
  if (utilization >= 0.8) return "bg-[var(--status-warning)]";
  return "bg-[var(--brand-operational)]";
}

function textTone(utilization: number): string {
  if (utilization >= 1) return "text-[var(--status-danger)]";
  if (utilization >= 0.8) return "text-[var(--status-warning)]";
  return "text-[var(--status-success)]";
}

export function FleetCapacityPanel({ branchCapacity, truckLanes }: FleetCapacityPanelProps) {
  const overloadedTrucks = truckLanes.filter((lane) => lane.utilization >= 0.8);

  return (
    <aside id="fleet-capacity" className="dispatch-mission__panel">
      <div className="dispatch-mission__panel-header">
        <p className="cs-text-eyebrow">Capacity</p>
        <p className="cs-text-section-title mt-1">Branch & truck load</p>
        <p className="cs-text-caption cs-text-muted mt-1">Committed vs available hours</p>
      </div>
      <div className="dispatch-mission__panel-body space-y-5">
        <div className="space-y-3">
          {branchCapacity.length === 0 ? (
            <p className="cs-text-caption cs-text-muted">No capacity snapshot for this date.</p>
          ) : (
            branchCapacity.map((branch) => (
              <div
                key={branch.branch_id}
                className="rounded-[var(--radius-md)] border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/70 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate cs-text-body font-semibold">{branch.branch_name}</p>
                  <p className={`cs-text-caption font-semibold tabular-nums ${textTone(branch.utilization)}`}>
                    {branch.committed_hours.toFixed(1)} / {branch.available_truck_hours.toFixed(1)}h
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-border-subtle)]">
                  <div
                    className={`h-full transition-all duration-300 ${barTone(branch.utilization)}`}
                    style={{ width: `${Math.min(100, Math.max(6, branch.utilization * 100))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 border-t border-[var(--surface-border-subtle)] pt-4">
          <p className="cs-text-micro cs-text-muted">Truck utilization</p>
          {truckLanes.slice(0, 6).map((lane) => (
            <div
              key={lane.truck_id}
              className="rounded-[var(--radius-md)] border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/70 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate cs-text-body font-semibold">{lane.unit_number}</p>
                <p className={`cs-text-caption font-semibold tabular-nums ${textTone(lane.utilization)}`}>
                  {(lane.utilization * 100).toFixed(0)}%
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-border-subtle)]">
                <div
                  className={`h-full transition-all duration-300 ${barTone(lane.utilization)}`}
                  style={{ width: `${Math.min(100, Math.max(6, lane.utilization * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {overloadedTrucks.length > 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--status-warning)_30%,transparent)] bg-[var(--status-warning-subtle)] p-3">
            <p className="cs-text-micro font-semibold text-[var(--status-warning)]">Capacity alerts</p>
            <ul className="mt-2 space-y-1 cs-text-caption text-[var(--status-warning)]">
              {overloadedTrucks.map((lane) => (
                <li key={lane.truck_id}>
                  {lane.unit_number} at {(lane.utilization * 100).toFixed(0)}% capacity
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
