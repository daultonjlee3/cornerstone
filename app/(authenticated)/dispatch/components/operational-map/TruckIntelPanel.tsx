"use client";

import {
  Clock,
  DollarSign,
  Gauge,
  MapPin,
  Sparkles,
  Truck,
  User,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import type { FleetDispatchJob, FleetDispatchTruckLane, FleetRecommendationInstance } from "@/src/types/fleet";
import { Button } from "@/src/components/ui/button";
import {
  formatCurrency,
  formatTime,
  recommendationForTruck,
  telematicsTone,
  truckGpsLabel,
  truckHoursRemaining,
  truckStatusLabel,
  utilizationDisplay,
} from "../fleet-dispatch-utils";

type TruckIntelPanelProps = {
  lane: FleetDispatchTruckLane;
  recommendations: FleetRecommendationInstance[];
  jobAlternatives?: Array<{ jobId: string; jobTitle: string; score: number; explanation: string[] }>;
  onClose: () => void;
  onSelectJob: (jobId: string | null) => void;
};

function timelineEntries(lane: FleetDispatchTruckLane): Array<{ label: string; time: string; job?: FleetDispatchJob }> {
  return lane.jobs
    .slice()
    .sort((a, b) => Date.parse(a.scheduled_start ?? "") - Date.parse(b.scheduled_start ?? ""))
    .map((job) => ({
      label: job.title,
      time: formatTime(job.scheduled_start),
      job,
    }));
}

export function TruckIntelPanel({
  lane,
  recommendations,
  jobAlternatives = [],
  onClose,
  onSelectJob,
}: TruckIntelPanelProps) {
  const status = truckStatusLabel(lane);
  const util = utilizationDisplay(lane);
  const gpsLabel = truckGpsLabel(lane.telematics_status);
  const hoursRemaining = truckHoursRemaining(lane);
  const currentJob = lane.jobs.find((j) => j.status === "in_progress") ?? lane.jobs[0];
  const rec = recommendationForTruck(lane.truck_id, recommendations);
  const timeline = timelineEntries(lane);

  return (
    <aside className="opmap-intel-panel" aria-label={`Truck ${lane.unit_number} intelligence`}>
      <header className="opmap-intel-panel__header">
        <div>
          <p className="opmap-intel-panel__eyebrow">Fleet unit</p>
          <h2 className="opmap-intel-panel__title">{lane.unit_number}</h2>
          <p className="opmap-intel-panel__meta">
            {lane.truck_type.replace(/_/g, " ")} · {lane.branch_name ?? "Branch"}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" aria-label="Close truck panel" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </header>

      <div className="opmap-intel-panel__body">
        <div className="opmap-intel-panel__status-row">
          <span className="opmap-intel-panel__status">{status}</span>
          <span className={`opmap-intel-panel__gps ${telematicsTone(lane.telematics_status)}`}>
            {lane.telematics_status === "offline" ? (
              <WifiOff className="size-3" />
            ) : (
              <Wifi className="size-3" />
            )}
            GPS {gpsLabel}
          </span>
        </div>

        {lane.operator_name ? (
          <div className="opmap-intel-panel__row">
            <User className="size-3.5 shrink-0 text-[var(--text-muted)]" />
            <span>{lane.operator_name}</span>
          </div>
        ) : null}

        <div className="opmap-intel-panel__metrics">
          <div className="opmap-intel-panel__metric">
            <DollarSign className="size-3.5" />
            <div>
              <p className="opmap-intel-panel__metric-label">Revenue today</p>
              <p className="opmap-intel-panel__metric-value">{formatCurrency(lane.revenue_today ?? 0)}</p>
            </div>
          </div>
          <div className="opmap-intel-panel__metric">
            <Gauge className="size-3.5" />
            <div>
              <p className="opmap-intel-panel__metric-label">Utilization</p>
              <p className={`opmap-intel-panel__metric-value`}>{util.label}</p>
            </div>
          </div>
          <div className="opmap-intel-panel__metric">
            <Clock className="size-3.5" />
            <div>
              <p className="opmap-intel-panel__metric-label">Hours remaining</p>
              <p className="opmap-intel-panel__metric-value">{hoursRemaining.toFixed(1)}h</p>
            </div>
          </div>
          <div className="opmap-intel-panel__metric">
            <MapPin className="size-3.5" />
            <div>
              <p className="opmap-intel-panel__metric-label">Branch</p>
              <p className="opmap-intel-panel__metric-value">{lane.branch_name ?? "—"}</p>
            </div>
          </div>
        </div>

        <section className="opmap-intel-panel__section">
          <p className="opmap-intel-panel__section-title">Current job</p>
          {currentJob ? (
            <button
              type="button"
              className="opmap-intel-panel__job-card"
              onClick={() => onSelectJob(currentJob.id)}
            >
              <Truck className="size-3.5 shrink-0 text-[var(--brand-operational)]" />
              <div className="min-w-0 text-left">
                <p className="line-clamp-2 font-semibold">{currentJob.title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{currentJob.site_name}</p>
              </div>
            </button>
          ) : (
            <p className="opmap-intel-panel__empty">No active assignment</p>
          )}
        </section>

        {lane.maintenance_note ? (
          <section className="opmap-intel-panel__section opmap-intel-panel__section--alert">
            <p className="opmap-intel-panel__section-title">Maintenance</p>
            <p>{lane.maintenance_note}</p>
          </section>
        ) : null}

        {timeline.length > 0 ? (
          <section className="opmap-intel-panel__section">
            <p className="opmap-intel-panel__section-title">Timeline</p>
            <ul className="opmap-intel-panel__timeline">
              {timeline.map((entry) => (
                <li key={entry.job?.id ?? entry.label}>
                  <span className="opmap-intel-panel__timeline-time">{entry.time}</span>
                  <button
                    type="button"
                    className="opmap-intel-panel__timeline-label"
                    onClick={() => entry.job && onSelectJob(entry.job.id)}
                  >
                    {entry.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {jobAlternatives.length > 0 ? (
          <section className="opmap-intel-panel__section">
            <p className="opmap-intel-panel__section-title">
              <Sparkles className="size-3.5" />
              Top jobs for this truck
            </p>
            <ul className="opmap-intel-panel__alt-list">
              {jobAlternatives.slice(0, 3).map((alt) => (
                <li key={alt.jobId}>
                  <button
                    type="button"
                    className="opmap-intel-panel__alt-row"
                    onClick={() => onSelectJob(alt.jobId)}
                  >
                    <span className="line-clamp-1 text-left">{alt.jobTitle}</span>
                    <span>{Math.round(alt.score)}</span>
                    <span className="line-clamp-1">{alt.explanation[0] ?? "Recommended"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {rec ? (
          <section className="opmap-intel-panel__section opmap-intel-panel__section--rec">
            <p className="opmap-intel-panel__section-title">
              <Sparkles className="size-3.5" />
              Recommendation
            </p>
            <p className="font-semibold leading-snug">{rec.rationale.title}</p>
            <ul className="mt-2 space-y-1 text-[11px] text-[var(--text-muted-strong)]">
              {rec.rationale.reasons.slice(0, 3).map((reason) => (
                <li key={reason}>· {reason}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
