"use client";

import { memo, useRef } from "react";
import { AlertCircle, ArrowRight, ChevronLeft, Sparkles } from "lucide-react";
import { AppIcon } from "@/src/components/design-system/icons";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetRecommendationInstance,
} from "@/src/types/fleet";
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
import { useVirtualWindow } from "./useVirtualWindow";

const VIRTUAL_THRESHOLD = 24;
const INBOX_ITEM_HEIGHT = 112;

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

type InboxJobRowProps = {
  job: FleetDispatchJob;
  board: FleetDispatchBoardData;
  selected: boolean;
  recommendations: FleetRecommendationInstance[];
  truckLanes: FleetDispatchTruckLane[];
  pending?: boolean;
  onSelectJob: (id: string | null) => void;
  onAssignToTruck: (jobId: string, truckId: string) => void;
};

const InboxJobRow = memo(function InboxJobRow({
  job,
  board,
  selected,
  recommendations,
  truckLanes,
  pending,
  onSelectJob,
  onAssignToTruck,
}: InboxJobRowProps) {
  const late = isLateJob(job);
  const duration = jobDurationHours(job);
  const rec = recommendationForJob(job.id, recommendations);
  const topTruck = rec?.rationale.candidates?.[0];
  const confidence = rec ? recommendationConfidence(rec) : null;
  const ignoreRisk = rec ? recommendationIgnoreRisk(rec, board) : null;
  const estimatedProfit = jobEstimatedProfit(job);
  const customer = extractCustomer(job.title, job.site_name);
  const jobType = extractJobType(job.title);
  const risk = operationalRiskMessage(job);
  const previewTitle = rec?.rationale.title ?? `${jobType} · ${formatCurrency(job.revenue_estimate)}`;

  const assignLanes = topTruck
    ? truckLanes.filter((lane) => lane.truck_id === topTruck.truck_id)
    : truckLanes.filter(
        (lane) => lane.truck_type === job.required_truck_type || job.required_truck_type === "any"
      );

  return (
    <li
      className={`dispatch-console__inbox-item ${selected ? "dispatch-console__inbox-item--selected" : ""} ${late || risk ? "dispatch-console__inbox-item--urgent" : ""}`}
    >
      <button
        type="button"
        className="dispatch-console__inbox-btn"
        title={previewTitle}
        onClick={() => onSelectJob(selected ? null : job.id)}
      >
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
          {assignLanes.slice(0, 4).map((lane) => (
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
    </li>
  );
});

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
  const scrollRef = useRef<HTMLUListElement>(null);
  const virtual = useVirtualWindow(
    sorted.length,
    INBOX_ITEM_HEIGHT,
    scrollRef,
    useDockItems && sorted.length > VIRTUAL_THRESHOLD ? 5 : 0
  );
  const useVirtual = useDockItems && sorted.length > VIRTUAL_THRESHOLD;
  const visibleJobs = useVirtual
    ? sorted.slice(virtual.startIndex, virtual.endIndex)
    : sorted;

  const shellClass = isEmbedded
    ? ""
    : isDock
      ? "dispatch-console__rail-panel"
      : "dispatch-mission__panel dispatch-mission__panel--inbox";

  const listBody = (
    <ul
      ref={scrollRef}
      onScroll={useVirtual ? virtual.onScroll : undefined}
      className={
        isEmbedded
          ? "dispatch-console__inbox-embedded"
          : isDock
            ? "dispatch-console__rail-body dispatch-console__inbox-scroll"
            : "dispatch-mission__panel-body dispatch-mission__inbox-list"
      }
      style={
        useVirtual
          ? { position: "relative", overflowY: "auto", maxHeight: "min(70vh, 640px)" }
          : undefined
      }
    >
      {sorted.length === 0 ? (
        <li className={useDockItems ? "py-8 text-center text-sm text-[var(--text-muted)]" : "dispatch-mission__inbox-empty"}>
          <p className="font-medium">Inbox clear</p>
          <p className="mt-1 text-xs">All jobs assigned</p>
        </li>
      ) : useVirtual ? (
        <div style={{ height: virtual.totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${virtual.offsetTop}px)` }}>
            {visibleJobs.map((job) => (
              <InboxJobRow
                key={job.id}
                job={job}
                board={board}
                selected={selectedJobId === job.id}
                recommendations={recommendations}
                truckLanes={truckLanes}
                pending={pending}
                onSelectJob={onSelectJob}
                onAssignToTruck={onAssignToTruck}
              />
            ))}
          </div>
        </div>
      ) : (
        visibleJobs.map((job) => (
          <InboxJobRow
            key={job.id}
            job={job}
            board={board}
            selected={selectedJobId === job.id}
            recommendations={recommendations}
            truckLanes={truckLanes}
            pending={pending}
            onSelectJob={onSelectJob}
            onAssignToTruck={onAssignToTruck}
          />
        ))
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
