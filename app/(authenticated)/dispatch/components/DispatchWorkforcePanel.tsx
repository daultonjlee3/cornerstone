"use client";

import { useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import type { DispatchInsights, DispatchWorkforce } from "../dispatch-data";
import { WorkloadPanel } from "./WorkloadPanel";

type DispatchWorkforcePanelProps = {
  workforce: DispatchWorkforce;
  insights: DispatchInsights;
  onCreateWorkOrder?: () => void;
  onAssignUnscheduled?: () => void;
  onRebalance?: () => void;
};

function toUtilization(workload: number, capacity: number): number {
  if (!Number.isFinite(capacity) || capacity <= 0) return 0;
  return workload / capacity;
}

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

export function DispatchWorkforcePanel({
  workforce,
  insights,
  onCreateWorkOrder,
  onAssignUnscheduled,
  onRebalance,
}: DispatchWorkforcePanelProps) {
  const technicianRows = useMemo(
    () =>
      workforce.technicians
        .map((technician) => ({
          ...technician,
          utilization: toUtilization(
            technician.workloadHoursToday,
            technician.dailyCapacityHours
          ),
        }))
        .sort((a, b) => b.utilization - a.utilization),
    [workforce.technicians]
  );

  const crewRows = useMemo(
    () =>
      workforce.crews
        .map((crew) => ({
          ...crew,
          utilization: toUtilization(crew.workloadHoursToday, crew.dailyCapacityHours),
        }))
        .sort((a, b) => b.utilization - a.utilization),
    [workforce.crews]
  );

  const alerts = useMemo(() => {
    const items: Array<{ tone: "warn" | "good"; text: string }> = [];
    if (insights.overdue > 0) {
      items.push({ tone: "warn", text: `${insights.overdue} overdue job(s) need dispatch attention.` });
    }
    if (insights.unscheduled > 0) {
      items.push({ tone: "warn", text: `${insights.unscheduled} unscheduled job(s) are still in queue.` });
    }
    const constrainedCrews = crewRows.filter((crew) => crew.utilization >= 0.8);
    constrainedCrews.slice(0, 2).forEach((crew) => {
      items.push({
        tone: "warn",
        text: `${crew.name} is at ${(crew.utilization * 100).toFixed(0)}% capacity.`,
      });
    });
    const availableCrew = crewRows.find((crew) => crew.utilization < 0.65);
    if (availableCrew) {
      items.push({
        tone: "good",
        text: `${availableCrew.name} has open capacity for additional assignments.`,
      });
    }
    if (items.length === 0) {
      items.push({ tone: "good", text: "Workload is balanced across active crews." });
    }
    return items.slice(0, 4);
  }, [crewRows, insights.overdue, insights.unscheduled]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <WorkloadPanel
        title="Technician Capacity"
        description="Use capacity bars to spot overloaded techs instantly."
        tableClassName="max-h-[320px] overflow-auto"
      >
        <div className="space-y-2.5">
          {technicianRows.map((technician) => (
            <div key={technician.id} className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/65 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  {technician.name}
                </p>
                <p className={`text-xs font-semibold ${textTone(technician.utilization)}`}>
                  {technician.workloadHoursToday.toFixed(1)} / {technician.dailyCapacityHours.toFixed(1)}h
                </p>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`h-full ${barTone(technician.utilization)}`}
                  style={{ width: `${Math.min(100, Math.max(6, technician.utilization * 100))}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {technician.currentAssignments} assigned · {technician.inProgress} active ·{" "}
                {technician.crewMemberships.length > 0
                  ? technician.crewMemberships.join(", ")
                  : "No crew membership"}
              </p>
            </div>
          ))}
        </div>
      </WorkloadPanel>

      <WorkloadPanel
        title="Crew Overview"
        description="Crew-level capacity and assignment pressure."
        tableClassName="max-h-[240px] overflow-auto"
      >
        <div className="space-y-2.5">
          {crewRows.map((crew) => (
            <div key={crew.id} className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/65 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{crew.name}</p>
                <p className={`text-xs font-semibold ${textTone(crew.utilization)}`}>
                  {crew.workloadHoursToday.toFixed(1)} / {crew.dailyCapacityHours.toFixed(1)}h
                </p>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={`h-full ${barTone(crew.utilization)}`}
                  style={{ width: `${Math.min(100, Math.max(6, crew.utilization * 100))}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {crew.memberCount} technician(s) · {crew.currentAssignments} assigned · {crew.activeJobs} active
              </p>
            </div>
          ))}
        </div>
      </WorkloadPanel>

      <WorkloadPanel
        title="Dispatch Alerts"
        description="Operational signals generated from current queue and workload."
      >
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.text}
              className={`rounded-lg border px-2.5 py-2 text-xs ${
                alert.tone === "warn"
                  ? "border-amber-300/80 bg-amber-50 text-amber-800"
                  : "border-emerald-300/80 bg-emerald-50 text-emerald-800"
              }`}
            >
              {alert.tone === "warn" ? "⚠" : "✓"} {alert.text}
            </li>
          ))}
        </ul>
      </WorkloadPanel>

      <WorkloadPanel title="Quick Actions" description="Common dispatch actions for faster board operations.">
        <div className="grid gap-2">
          <Button type="button" onClick={onCreateWorkOrder}>
            + Create Work Order
          </Button>
          <Button type="button" variant="secondary" onClick={onAssignUnscheduled}>
            + Assign Unscheduled Jobs
          </Button>
          <Button type="button" variant="secondary" onClick={onRebalance}>
            + Rebalance Workload
          </Button>
        </div>
      </WorkloadPanel>
    </div>
  );
}
