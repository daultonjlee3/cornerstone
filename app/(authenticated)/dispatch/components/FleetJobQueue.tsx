"use client";

import { AlertCircle, ArrowRight, ChevronLeft, Sparkles } from "lucide-react";
import { AppIcon } from "@/src/components/design-system/icons";
import { motion } from "framer-motion";
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
  recommendationConfidence,
  recommendationConfidenceExplanation,
  recommendationForJob,
  recommendationIgnoreRisk,
} from "./fleet-dispatch-utils";
import { confidenceLabel } from "../../operations/components/fleet-recommendation-utils";

type FleetJobQueueProps = {
  layout?: "panel" | "float" | "cockpit" | "embedded";
  jobs: FleetDispatchJob[];
  board: FleetDispatchBoardData;
  selectedJobId: string | null;
  onSelectJob: (id: string | null) => void;
  onAssignToTruck: (jobId: string, truckId: string) => void;
  truckLanes: FleetDispatchTruckLane[];
  recommendations: FleetRecommendationInstance[];
  pending?: boolean;
  onCollapse?: () => void;
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
  layout = "panel",
  jobs,
  board,
  selectedJobId,
  onSelectJob,
  onAssignToTruck,
  truckLanes,
  recommendations,
  pending,
  onCollapse,
}: FleetJobQueueProps) {
  const sorted = sortJobs(jobs);
  const isDock = layout === "float" || layout === "cockpit";
  const isEmbedded = layout === "embedded";
  const useDockItems = isDock || isEmbedded;

  const shellClass = isEmbedded
    ? ""
    : isDock
      ? "dispatch-console__rail-panel"
      : "dispatch-mission__panel dispatch-mission__panel--inbox";

  const listBody = (
    <ul
      className={
        isEmbedded
          ? "dispatch-console__inbox-embedded"
          : isDock
            ? "dispatch-console__rail-body"
            : "dispatch-mission__panel-body dispatch-mission__inbox-list"
      }
    >
        {sorted.length === 0 ? (
          <li className={useDockItems ? "py-8 text-center text-sm text-[var(--text-muted)]" : "dispatch-mission__inbox-empty"}>
            <p className="font-medium">Inbox clear</p>
            <p className="mt-1 text-xs">All jobs assigned</p>
          </li>
        ) : (
          sorted.map((job, index) => {
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

            if (useDockItems) {
              return (
                <motion.li
                  key={job.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: index * 0.025 }}
                  className={`dispatch-console__inbox-item ${selected ? "dispatch-console__inbox-item--selected" : ""} ${late || risk ? "dispatch-console__inbox-item--urgent" : ""}`}
                >
                  <button type="button" className="dispatch-console__inbox-btn" onClick={() => onSelectJob(selected ? null : job.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="dispatch-console__inbox-revenue">{formatCurrency(job.revenue_estimate)}</span>
                      <PriorityBadge priority={job.priority} />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">{customer}</p>
                    <p className="dispatch-console__inbox-title">{jobType}</p>
                    <div className="dispatch-console__inbox-facts">
                      <span>{formatCurrency(estimatedProfit)} contrib</span>
                      <span>{formatTime(job.scheduled_start)}</span>
                      {duration != null ? <span>{duration}h</span> : null}
                      {job.estimated_deadhead_miles != null ? (
                        <span>{job.estimated_deadhead_miles.toFixed(1)} mi deadhead</span>
                      ) : null}
                    </div>
                    {topTruck ? (
                      <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-[var(--brand-operational)]">
                        <AppIcon icon={Sparkles} size="xs" intent="ai" />
                        Truck {topTruck.unit_number}
                        {confidence ? ` · ${confidenceLabel(confidence)}` : ""}
                      </p>
                    ) : null}
                    {ignoreRisk ? <p className="mt-1 text-[10px] text-[var(--status-warning)]">{ignoreRisk}</p> : null}
                    {risk ? (
                      <p className="dispatch-console__inbox-warn flex items-center gap-1.5">
                        <AppIcon icon={AlertCircle} size="xs" intent="warning" />
                        {risk}
                      </p>
                    ) : null}
                  </button>
                  {selected ? (
                    <div className="dispatch-console__inbox-assign">
                      {(topTruck
                        ? truckLanes.filter((l) => l.truck_id === topTruck.truck_id)
                        : truckLanes.filter(
                            (lane) =>
                              lane.truck_type === job.required_truck_type || job.required_truck_type === "any"
                          )
                      )
                        .slice(0, 4)
                        .map((lane) => (
                          <Button
                            key={lane.truck_id}
                            type="button"
                            size="sm"
                            variant={topTruck?.truck_id === lane.truck_id ? "primary" : "secondary"}
                            className="mb-1 w-full justify-between text-[11px]"
                            disabled={pending}
                            onClick={() => onAssignToTruck(job.id, lane.truck_id)}
                          >
                            {lane.unit_number}
                            {topTruck?.truck_id === lane.truck_id ? (
                            <AppIcon icon={ArrowRight} size="xs" intent="muted" />
                            ) : null}
                          </Button>
                        ))}
                    </div>
                  ) : null}
                </motion.li>
              );
            }

            return (
              <li
                key={job.id}
                className={`dispatch-mission__job-card ${selected ? "dispatch-mission__job-card--selected" : ""}`}
              >
                <button type="button" className="dispatch-mission__job-card-body w-full text-left" onClick={() => onSelectJob(selected ? null : job.id)}>
                  <p className="dispatch-mission__job-revenue-value">{formatCurrency(job.revenue_estimate)}</p>
                  <p className="dispatch-mission__job-title">{jobType}</p>
                  {confidenceExplanation ? <p className="text-xs text-[var(--text-muted)]">{confidenceExplanation}</p> : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
  );

  if (isEmbedded) {
    return <div id="fleet-job-queue">{listBody}</div>;
  }

  return (
    <aside id="fleet-job-queue" className={shellClass}>
      <div className={isDock ? "dispatch-console__rail-header" : "dispatch-mission__panel-header dispatch-mission__panel-header--minimal"}>
        <div className="min-w-0 flex-1">
          <p className={isDock ? "dispatch-console__dock-eyebrow" : "dispatch-mission__panel-eyebrow"}>
            Dispatch inbox
          </p>
          <p className={isDock ? "dispatch-console__dock-title" : "dispatch-mission__panel-title"}>
            {jobs.length} need{jobs.length === 1 ? "s" : ""} a decision
          </p>
          <p className={isDock ? "dispatch-console__dock-meta" : "dispatch-mission__panel-meta"}>
            Priority · revenue · arrival
          </p>
        </div>
        {layout === "cockpit" && onCollapse ? (
          <button
            type="button"
            className="dispatch-console__rail-collapse"
            onClick={onCollapse}
            aria-label="Collapse dispatch inbox"
            title="Collapse inbox"
          >
            <AppIcon icon={ChevronLeft} size="sm" intent="muted" />
          </button>
        ) : null}
      </div>
      {listBody}
    </aside>
  );
}
