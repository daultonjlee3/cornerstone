"use client";

import {
  AlertCircle,
  Building2,
  Clock,
  MapPin,
  Sparkles,
  Truck,
} from "lucide-react";
import type { FleetDispatchJob, FleetDispatchTruckLane, FleetRecommendationInstance, FleetDispatchBoardData } from "@/src/types/fleet";
import { Button } from "@/src/components/ui/button";
import { PriorityBadge } from "@/src/components/ui/priority-badge";
import {
  confidenceTone,
  extractCustomer,
  extractJobType,
  formatCurrency,
  formatTime,
  isLateJob,
  jobDurationHours,
  jobEstimatedProfit,
  operationalRiskMessage,
  priorityUrgencyClass,
  recommendationConfidence,
  recommendationConfidenceExplanation,
  recommendationForJob,
  recommendationIgnoreRisk,
} from "./fleet-dispatch-utils";
import { confidenceLabel } from "../../operations/components/fleet-recommendation-utils";

type FleetJobQueueProps = {
  jobs: FleetDispatchJob[];
  board: FleetDispatchBoardData;
  selectedJobId: string | null;
  onSelectJob: (id: string | null) => void;
  onAssignToTruck: (jobId: string, truckId: string) => void;
  truckLanes: FleetDispatchTruckLane[];
  recommendations: FleetRecommendationInstance[];
  pending?: boolean;
};

function sortJobs(jobs: FleetDispatchJob[]): FleetDispatchJob[] {
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  return [...jobs].sort((a, b) => {
    const lateA = isLateJob(a) ? 0 : 1;
    const lateB = isLateJob(b) ? 0 : 1;
    if (lateA !== lateB) return lateA - lateB;
    const pA = priorityOrder[a.priority] ?? 9;
    const pB = priorityOrder[b.priority] ?? 9;
    if (pA !== pB) return pA - pB;
    return (b.revenue_estimate ?? 0) - (a.revenue_estimate ?? 0);
  });
}

export function FleetJobQueue({
  jobs,
  board,
  selectedJobId,
  onSelectJob,
  onAssignToTruck,
  truckLanes,
  recommendations,
  pending,
}: FleetJobQueueProps) {
  const sorted = sortJobs(jobs);

  return (
    <aside
      id="fleet-job-queue"
      className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/92 shadow-[var(--elevation-1)]"
    >
      <div className="border-b border-[var(--surface-border-subtle)] px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Job queue</p>
        <p className="text-[10px] text-[var(--muted)]">
          {jobs.length} unassigned · highest priority first
        </p>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto p-2">
        {sorted.length === 0 ? (
          <li className="flex flex-col items-center px-4 py-8 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">Queue clear</p>
            <p className="mt-1 text-xs text-[var(--muted)]">All jobs assigned for this date</p>
          </li>
        ) : (
          sorted.map((job) => {
            const selected = selectedJobId === job.id;
            const late = isLateJob(job);
            const duration = jobDurationHours(job);
            const rec = recommendationForJob(job.id, recommendations);
            const topTruck = rec?.rationale.candidates?.[0];
            const confidence = rec ? recommendationConfidence(rec) : null;
            const confidenceExplanation = rec ? recommendationConfidenceExplanation(rec, board) : null;
            const ignoreRisk = rec ? recommendationIgnoreRisk(rec, board) : null;
            const estimatedProfit = jobEstimatedProfit(job);
            const customer = extractCustomer(job.title, job.site_name);
            const jobType = extractJobType(job.title);
            const risk = operationalRiskMessage(job);

            return (
              <li
                key={job.id}
                className={`rounded-lg border bg-[var(--surface-default)]/72 transition-all duration-150 ${priorityUrgencyClass(job.priority)} ${
                  selected
                    ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/30 shadow-[var(--elevation-1)]"
                    : "border-[var(--surface-border-subtle)] hover:border-[var(--foreground)]/15 hover:-translate-y-[1px]"
                }`}
              >
                <button
                  type="button"
                  className="w-full space-y-2.5 p-2.5 text-left"
                  onClick={() => onSelectJob(selected ? null : job.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-[var(--muted)]">{customer}</p>
                      <p className="line-clamp-1 text-sm font-bold text-[var(--foreground)]">{jobType}</p>
                    </div>
                    <PriorityBadge priority={job.priority} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <DecisionMetric value={formatCurrency(job.revenue_estimate)} label="Revenue" />
                    <DecisionMetric value={formatCurrency(estimatedProfit)} label="Contribution" />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <Stat icon={Clock} value={formatTime(job.scheduled_start)} label="arrival" />
                    {duration != null ? <Stat icon={Clock} value={`${duration}h`} label="duration" /> : null}
                    <Stat icon={Truck} value={job.required_truck_type} label="truck type" />
                    {job.estimated_deadhead_miles != null ? (
                      <Stat
                        icon={MapPin}
                        value={`${job.estimated_deadhead_miles.toFixed(1)} mi`}
                        label="deadhead"
                      />
                    ) : null}
                  </div>

                  <p className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{job.site_name ?? "Site"}</span>
                  </p>
                  {job.branch_name ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--muted)]">
                      <Building2 className="size-3 shrink-0" />
                      {job.branch_name}
                    </p>
                  ) : null}

                  {job.estimated_deadhead_miles != null ? (
                    <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300">
                      {job.estimated_deadhead_miles.toFixed(1)} mi deadhead
                      {job.estimated_travel_minutes != null ? ` · ${job.estimated_travel_minutes} min` : ""}
                    </p>
                  ) : null}

                  {topTruck ? (
                    <div className="space-y-1 rounded-md border border-[color-mix(in_srgb,var(--status-info)_28%,transparent)] bg-[var(--status-info-subtle)] px-2 py-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                          <Sparkles className="size-3" />
                          {topTruck.unit_number}
                        </span>
                        {confidence ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${confidenceTone(confidence)}`}
                          >
                            {confidenceLabel(confidence)}
                          </span>
                        ) : null}
                      </div>
                      {confidenceExplanation ? (
                        <p className="text-[9px] leading-snug text-[var(--muted)]">{confidenceExplanation}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {ignoreRisk ? (
                    <p className="mt-1.5 text-[10px] leading-snug text-amber-800 dark:text-amber-300">
                      {ignoreRisk}
                    </p>
                  ) : null}

                  {risk ? (
                    <p className="flex items-start gap-1 text-[10px] font-semibold text-red-700 dark:text-red-400">
                      <AlertCircle className="mt-0.5 size-3 shrink-0" />
                      {risk}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-1">
                    {late ? (
                      <Badge tone="red" icon={AlertCircle}>
                        Late
                      </Badge>
                    ) : null}
                    <Badge tone="muted">{job.status.replace("_", " ")}</Badge>
                  </div>
                </button>

                {selected ? (
                  <div className="space-y-1 border-t border-[var(--surface-border-subtle)] px-2.5 pb-2.5 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Quick assign
                    </p>
                    {(topTruck
                      ? truckLanes.filter((l) => l.truck_id === topTruck.truck_id)
                      : truckLanes.filter(
                          (lane) =>
                            lane.truck_type === job.required_truck_type ||
                            job.required_truck_type === "any"
                        )
                    )
                      .slice(0, 6)
                      .map((lane) => (
                        <Button
                          key={lane.truck_id}
                          type="button"
                          size="sm"
                          variant={topTruck?.truck_id === lane.truck_id ? "primary" : "secondary"}
                          className="w-full justify-start text-[11px]"
                          disabled={pending}
                          onClick={() => onAssignToTruck(job.id, lane.truck_id)}
                        >
                          {lane.unit_number}
                          {topTruck?.truck_id === lane.truck_id ? " · Recommended" : ""}
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

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label?: string;
}) {
  return (
    <div className="rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/75 px-1.5 py-1">
      <div className="flex items-center gap-1">
        <Icon className="size-3 text-[var(--text-muted)]" />
        <span className="truncate text-[10px] font-semibold">{value}</span>
      </div>
      {label ? <p className="text-[9px] capitalize text-[var(--muted)]">{label}</p> : null}
    </div>
  );
}

function DecisionMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/75 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function Badge({
  children,
  tone,
  icon: Icon,
}: {
  children: React.ReactNode;
  tone: "red" | "muted";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const cls =
    tone === "red"
      ? "border border-red-300 text-red-700 dark:text-red-400"
      : "border border-[var(--card-border)] text-[var(--muted)]";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${cls}`}>
      {Icon ? <Icon className="size-3" /> : null}
      {children}
    </span>
  );
}
