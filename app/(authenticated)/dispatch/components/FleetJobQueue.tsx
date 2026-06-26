"use client";

import {
  AlertCircle,
  ArrowRight,
  Clock,
  MapPin,
  Sparkles,
} from "lucide-react";
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
    <aside id="fleet-job-queue" className="dispatch-mission__panel dispatch-mission__panel--inbox">
      <div className="dispatch-mission__panel-header dispatch-mission__panel-header--minimal">
        <p className="dispatch-mission__panel-eyebrow">Job queue</p>
        <div className="dispatch-mission__panel-title-row">
          <p className="dispatch-mission__panel-title">{jobs.length} unassigned</p>
          <span className="dispatch-mission__panel-meta">Priority sorted</span>
        </div>
      </div>
      <ul className="dispatch-mission__panel-body dispatch-mission__inbox-list">
        {sorted.length === 0 ? (
          <li className="dispatch-mission__inbox-empty">
            <p className="font-medium">Queue clear</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">All jobs assigned for this date</p>
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

            return (
              <motion.li
                key={job.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={`dispatch-mission__job-card ${priorityUrgencyClass(job.priority)} ${
                  selected ? "dispatch-mission__job-card--selected" : ""
                } ${late || risk ? "dispatch-mission__job-card--urgent" : ""}`}
              >
                <button
                  type="button"
                  className="dispatch-mission__job-card-body"
                  onClick={() => onSelectJob(selected ? null : job.id)}
                >
                  <div className="dispatch-mission__job-card-head">
                    <div className="min-w-0">
                      <p className="dispatch-mission__job-customer">{customer}</p>
                      <p className="dispatch-mission__job-title">{jobType}</p>
                    </div>
                    <PriorityBadge priority={job.priority} />
                  </div>

                  <div className="dispatch-mission__job-revenue">
                    <span className="dispatch-mission__job-revenue-value">
                      {formatCurrency(job.revenue_estimate)}
                    </span>
                    <span className="dispatch-mission__job-revenue-label">
                      {formatCurrency(estimatedProfit)} contribution
                    </span>
                  </div>

                  <div className="dispatch-mission__job-facts">
                    <span>{formatTime(job.scheduled_start)} arrival</span>
                    {duration != null ? <span>{duration}h window</span> : null}
                    {job.estimated_deadhead_miles != null ? (
                      <span className="dispatch-mission__job-fact--warn">
                        {job.estimated_deadhead_miles.toFixed(1)} mi deadhead
                        {job.estimated_travel_minutes != null ? ` · ${job.estimated_travel_minutes} min` : ""}
                      </span>
                    ) : null}
                  </div>

                  <p className="dispatch-mission__job-location">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{job.site_name ?? "Site"}</span>
                  </p>

                  {topTruck ? (
                    <div className="dispatch-mission__job-rec">
                      <div className="dispatch-mission__job-rec-head">
                        <span className="flex items-center gap-1.5 font-semibold text-[var(--brand-operational)]">
                          <Sparkles className="size-3.5" />
                          Truck {topTruck.unit_number}
                        </span>
                        {confidence ? (
                          <span
                            className={`dispatch-mission__confidence-pill ${confidenceTone(confidence)}`}
                          >
                            {confidenceLabel(confidence)}
                          </span>
                        ) : null}
                      </div>
                      {confidenceExplanation ? (
                        <p className="dispatch-mission__job-rec-detail">{confidenceExplanation}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {ignoreRisk ? (
                    <p className="dispatch-mission__job-warning dispatch-mission__job-warning--amber">
                      {ignoreRisk}
                    </p>
                  ) : null}

                  {risk ? (
                    <p className="dispatch-mission__job-warning">
                      <AlertCircle className="size-3.5 shrink-0" />
                      {risk}
                    </p>
                  ) : null}

                  {late ? (
                    <span className="dispatch-mission__job-late-badge">Late</span>
                  ) : null}
                </button>

                <div className="dispatch-mission__job-status">{job.status.replace("_", " ")}</div>

                {selected ? (
                  <div className="dispatch-mission__job-assign">
                    <p className="dispatch-mission__job-assign-label">Quick assign</p>
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
                          className="w-full justify-between text-[11px]"
                          disabled={pending}
                          onClick={() => onAssignToTruck(job.id, lane.truck_id)}
                        >
                          <span>{lane.unit_number}</span>
                          {topTruck?.truck_id === lane.truck_id ? (
                            <span className="flex items-center gap-1 opacity-90">
                              Recommended <ArrowRight className="size-3" />
                            </span>
                          ) : null}
                        </Button>
                      ))}
                  </div>
                ) : null}
              </motion.li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
