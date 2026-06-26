"use client";

import {
  AlertTriangle,
  Clock,
  DollarSign,
  Fuel,
  MapPin,
  Sparkles,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AppIcon } from "@/src/components/design-system/icons";
import type { FleetDispatchJob, FleetDispatchTruckLane, FleetRecommendationInstance } from "@/src/types/fleet";
import { Button } from "@/src/components/ui/button";
import {
  formatCurrency,
  recommendationForTruck,
  telematicsTone,
  truckHoursRemaining,
  truckGpsLabel,
  truckStatusLabel,
  utilizationDisplay,
  utilizationTone,
} from "./fleet-dispatch-utils";

type FleetTruckLanesProps = {
  lanes: FleetDispatchTruckLane[];
  selectedJob: FleetDispatchJob | null;
  highlightedTruckId: string | null;
  recommendations: FleetRecommendationInstance[];
  onSelectTruck: (truckId: string | null) => void;
  onAssign: (jobId: string, truckId: string) => void;
  onUnassign: (jobId: string) => void;
  pending?: boolean;
};

export function FleetTruckLanes({
  lanes,
  selectedJob,
  highlightedTruckId,
  recommendations,
  onSelectTruck,
  onAssign,
  onUnassign,
  pending,
}: FleetTruckLanesProps) {
  return (
    <div
      id="fleet-truck-lanes"
      className="dispatch-mission__panel max-h-[220px] shrink-0 overflow-hidden"
    >
      <div className="dispatch-mission__panel-header py-3">
        <p className="cs-text-eyebrow">Fleet units</p>
        <p className="cs-text-caption cs-text-muted mt-1">{lanes.length} trucks on board</p>
      </div>
      <div className="overflow-x-auto px-4 pb-4">
      <div className="flex gap-3">
        {lanes.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No trucks configured.</p>
        ) : (
          lanes.map((lane) => {
            const highlighted = highlightedTruckId === lane.truck_id;
            const rec = recommendationForTruck(lane.truck_id, recommendations);
            const currentJob = lane.jobs.find((j) => j.status === "in_progress") ?? lane.jobs[0];
            const status = truckStatusLabel(lane);
            const util = utilizationDisplay(lane);
            const hoursRemaining = truckHoursRemaining(lane);
            const gpsLabel = truckGpsLabel(lane.telematics_status);

            const statusColor =
              status === "Available"
                ? "border border-emerald-300 text-emerald-800 dark:text-emerald-400"
                : status === "Working"
                  ? "border border-blue-300 text-blue-800 dark:text-blue-400"
                  : status === "Offline" || status === "Maintenance"
                    ? "border border-red-300 text-red-700 dark:text-red-400"
                    : "border border-[var(--card-border)] text-[var(--muted)]";

            return (
              <div
                key={lane.truck_id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectTruck(highlighted ? null : lane.truck_id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelectTruck(highlighted ? null : lane.truck_id);
                }}
                className={`w-64 shrink-0 cursor-pointer rounded-[var(--radius-lg)] border bg-[var(--surface-default)]/80 p-4 transition-all duration-150 ${
                  highlighted
                    ? "border-[var(--brand-operational)] ring-1 ring-[var(--brand-operational)]/25 shadow-[var(--elevation-2)]"
                    : "border-[var(--surface-border-subtle)] hover:border-[color-mix(in_srgb,var(--brand-operational)_20%,transparent)] hover:shadow-[var(--elevation-1)]"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="text-base font-bold tabular-nums">{lane.unit_number}</p>
                    <p className="text-[10px] capitalize text-[var(--muted)]">{lane.truck_type.replace("_", " ")}</p>
                  </div>
                  <span
                    className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${telematicsTone(lane.telematics_status)}`}
                    title={`GPS ${gpsLabel}`}
                  >
                    {lane.telematics_status === "offline" ? (
                      <WifiOff className="size-2.5" />
                    ) : (
                      <Wifi className="size-2.5" />
                    )}
                    {gpsLabel}
                  </span>
                </div>

                <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusColor}`}>
                  {status}
                </span>

                {currentJob ? (
                  <p className="mt-1.5 line-clamp-2 rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/70 px-1.5 py-1 text-[10px] font-medium leading-snug">
                    {currentJob.title}
                  </p>
                ) : status === "Available" ? (
                  <p className="mt-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Ready for assignment
                  </p>
                ) : null}

                <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
                  <span className="flex items-center gap-0.5 rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] px-1.5 py-1 font-semibold">
                    <DollarSign className="size-2.5 text-emerald-600" />
                    {formatCurrency(lane.revenue_today ?? 0)}
                  </span>
                  <span className="flex items-center gap-0.5 rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] px-1.5 py-1 font-semibold">
                    <Clock className="size-2.5" />
                    {hoursRemaining.toFixed(1)}h left
                  </span>
                  {lane.fuel_level_pct != null ? (
                    <span className="flex items-center gap-0.5 rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] px-1.5 py-1 font-semibold">
                      <Fuel className="size-2.5" />
                      {Math.round(lane.fuel_level_pct)}% fuel
                    </span>
                  ) : null}
                  <span className="flex items-center gap-0.5 rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] px-1.5 py-1 font-semibold">
                    <MapPin className="size-2.5" />
                    {lane.branch_name ?? "Branch"}
                  </span>
                </div>

                {lane.operator_name ? (
                  <p className="mt-1.5 flex items-center gap-1 truncate text-[10px] text-[var(--muted)]">
                    <AppIcon icon={User} size="xs" intent="muted" className="shrink-0" />
                    {lane.operator_name}
                  </p>
                ) : null}

                <div className="mt-2">
                  <div className="flex justify-between text-[9px] font-medium text-[var(--muted)]">
                    <span>Utilization</span>
                    <span className={util.pct > 100 ? "font-bold text-red-600" : ""}>{util.label}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className={`h-full transition-all ${utilizationTone(lane.utilization)}`}
                      style={{ width: `${util.barPct}%` }}
                    />
                  </div>
                  {util.explanation ? (
                    <p className="mt-0.5 text-[9px] leading-tight text-[var(--muted)]">{util.explanation}</p>
                  ) : (
                    <p className="mt-0.5 text-[9px] text-[var(--muted)]">
                      {lane.committed_hours.toFixed(1)} / {lane.available_hours.toFixed(1)}h committed
                      {(lane.idle_hours ?? 0) > 0.5 ? ` · ${lane.idle_hours?.toFixed(1)}h idle` : ""}
                    </p>
                  )}
                </div>

                {lane.maintenance_note ? (
                  <p className="mt-1 flex items-center gap-0.5 text-[9px] font-medium text-amber-800">
                    <AppIcon icon={AlertTriangle} size="xs" intent="warning" />
                    {lane.status === "maintenance" ? "In maintenance" : "Service due soon"}
                  </p>
                ) : null}

                {rec ? (
                  <p className="mt-1.5 flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--status-info)_28%,transparent)] bg-[var(--status-info-subtle)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--status-info)]">
                    <AppIcon icon={Sparkles} size="xs" intent="ai" />
                    Cornerstone recommends this truck
                  </p>
                ) : null}

                {lane.jobs.length > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2 h-6 w-full text-[9px]"
                    disabled={pending}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnassign(lane.jobs[0].id);
                    }}
                  >
                    Unassign current
                  </Button>
                ) : null}

                {selectedJob ? (
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2 w-full text-[10px]"
                    disabled={pending}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssign(selectedJob.id, lane.truck_id);
                    }}
                  >
                    Assign selected job
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      </div>
    </div>
  );
}
