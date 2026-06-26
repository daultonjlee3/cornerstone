"use client";

import { useCallback, useMemo, useRef } from "react";
import { AlertTriangle, Sparkles, Truck, Zap } from "lucide-react";
import type { FleetDispatchBoardData, FleetRecommendationInstance } from "@/src/types/fleet";
import {
  extractJobType,
  formatCurrency,
  formatTime,
  isLateJob,
  jobDurationHours,
  jobEstimatedProfit,
} from "./fleet-dispatch-utils";

type FleetDispatchTimelineProps = {
  board: FleetDispatchBoardData;
  recommendations: FleetRecommendationInstance[];
};

type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  subtitle?: string;
  meta?: string;
  tone: "working" | "risk" | "idle" | "rec";
  priority?: "urgent" | "high" | "medium" | "low";
};

function confidencePct(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function FleetDispatchTimeline({ board, recommendations }: FleetDispatchTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const events = useMemo(() => {
    const list: TimelineEvent[] = [];

    for (const lane of board.truckLanes) {
      const active = lane.jobs.find((j) => j.status === "in_progress");
      if (active) {
        const duration = jobDurationHours(active);
        list.push({
          id: `work-${lane.truck_id}`,
          time: formatTime(active.scheduled_start),
          title: `${lane.unit_number} · ${extractJobType(active.title)}`,
          subtitle: active.revenue_estimate ? formatCurrency(active.revenue_estimate) : undefined,
          meta: duration != null ? `${duration}h on site` : "In progress",
          tone: "working",
        });
      }
    }

    for (const job of board.unassignedJobs) {
      if (isLateJob(job) || job.priority === "urgent") {
        const profit = jobEstimatedProfit(job);
        list.push({
          id: `risk-${job.id}`,
          time: formatTime(job.scheduled_start),
          title: `Unassigned · ${extractJobType(job.title)}`,
          subtitle: job.revenue_estimate ? formatCurrency(job.revenue_estimate) : undefined,
          meta: `${formatCurrency(profit)} contrib`,
          tone: "risk",
          priority: job.priority,
        });
      }
    }

    const available = board.truckLanes.filter(
      (l) => l.status === "active" && l.jobs.length === 0
    ).length;
    if (available > 0) {
      list.push({
        id: "available",
        time: "Now",
        title: `${available} truck${available === 1 ? "" : "s"} ready`,
        meta: "Capacity available",
        tone: "idle",
      });
    }

    if (recommendations.length > 0) {
      const top = recommendations[0];
      const snap = top.rationale.candidate_snapshots?.[0];
      list.push({
        id: "recs",
        time: "AI",
        title: top.rationale.title,
        subtitle: snap
          ? formatCurrency(snap.estimated_contribution)
          : `${recommendations.length} awaiting review`,
        meta: snap
          ? `${confidencePct(top.rationale.candidates?.[0]?.score ?? 0)} score`
          : undefined,
        tone: "rec",
      });
    }

    return list.slice(0, 14);
  }, [board, recommendations]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      if (!el) return;
      const step = 220;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        el.scrollBy({ left: step, behavior: "smooth" });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        el.scrollBy({ left: -step, behavior: "smooth" });
      }
    },
    []
  );

  if (events.length === 0) return null;

  return (
    <div className="dispatch-console__timeline" id="fleet-dispatch-timeline">
      <div className="dispatch-console__timeline-head">
        <span className="dispatch-console__timeline-label">Mission timeline</span>
        <span className="dispatch-console__timeline-hint" aria-hidden>
          ← →
        </span>
      </div>
      <div
        ref={scrollRef}
        className="dispatch-console__timeline-scroll"
        role="list"
        aria-label="Live operational timeline"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {events.map((event) => (
          <article
            key={event.id}
            role="listitem"
            className={`dispatch-console__timeline-card dispatch-console__timeline-card--${event.tone}`}
          >
            <div className="dispatch-console__timeline-card-top">
              <span className="dispatch-console__timeline-card-icon" aria-hidden>
                {event.tone === "risk" ? (
                  <AlertTriangle className="size-3.5" />
                ) : event.tone === "rec" ? (
                  <Sparkles className="size-3.5" />
                ) : event.tone === "working" ? (
                  <Truck className="size-3.5" />
                ) : (
                  <Zap className="size-3.5" />
                )}
              </span>
              <span className="dispatch-console__timeline-event-time">{event.time}</span>
              {event.priority === "urgent" ? (
                <span className="dispatch-console__timeline-priority">Urgent</span>
              ) : null}
            </div>
            <p className="dispatch-console__timeline-event-text">{event.title}</p>
            {event.subtitle ? (
              <p className="dispatch-console__timeline-card-revenue">{event.subtitle}</p>
            ) : null}
            {event.meta ? <p className="dispatch-console__timeline-card-meta">{event.meta}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
