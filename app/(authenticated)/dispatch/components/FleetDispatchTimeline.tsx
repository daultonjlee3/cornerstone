"use client";

import { useMemo } from "react";
import type { FleetDispatchBoardData, FleetRecommendationInstance } from "@/src/types/fleet";
import { extractJobType, formatTime, isLateJob } from "./fleet-dispatch-utils";

type FleetDispatchTimelineProps = {
  board: FleetDispatchBoardData;
  recommendations: FleetRecommendationInstance[];
};

type TimelineEvent = {
  id: string;
  time: string;
  text: string;
  tone: "working" | "risk" | "idle";
};

export function FleetDispatchTimeline({ board, recommendations }: FleetDispatchTimelineProps) {
  const events = useMemo(() => {
    const list: TimelineEvent[] = [];

    for (const lane of board.truckLanes) {
      const active = lane.jobs.find((j) => j.status === "in_progress");
      if (active) {
        list.push({
          id: `work-${lane.truck_id}`,
          time: formatTime(active.scheduled_start),
          text: `${lane.unit_number} · ${extractJobType(active.title)}`,
          tone: "working",
        });
      }
    }

    for (const job of board.unassignedJobs) {
      if (isLateJob(job) || job.priority === "urgent") {
        list.push({
          id: `risk-${job.id}`,
          time: formatTime(job.scheduled_start),
          text: `Unassigned · ${extractJobType(job.title)}`,
          tone: "risk",
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
        text: `${available} trucks available for dispatch`,
        tone: "idle",
      });
    }

    if (recommendations.length > 0) {
      list.push({
        id: "recs",
        time: "AI",
        text: `${recommendations.length} recommendation${recommendations.length === 1 ? "" : "s"} awaiting review`,
        tone: "working",
      });
    }

    return list.slice(0, 12);
  }, [board, recommendations]);

  if (events.length === 0) return null;

  return (
    <div className="dispatch-console__timeline" id="fleet-dispatch-timeline">
      <span className="dispatch-console__timeline-label">Live ops</span>
      <div className="dispatch-console__timeline-scroll">
        {events.map((event) => (
          <div
            key={event.id}
            className={`dispatch-console__timeline-event dispatch-console__timeline-event--${event.tone}`}
          >
            <span className="dispatch-console__timeline-event-time">{event.time}</span>
            <span className="dispatch-console__timeline-event-text">{event.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
