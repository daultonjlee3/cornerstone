"use client";

import {
  AlertTriangle,
  DollarSign,
  Fuel,
  MapPin,
  Sparkles,
  User,
  Wifi,
  WifiOff,
} from "lucide-react";
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
      className="max-h-[260px] overflow-x-auto overflow-y-hidden rounded-lg border border-[var(--card-border)] bg-white p-2 shadow-sm dark:bg-[var(--card)]"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Fleet units · {lanes.length} trucks
      </p>
      <div className="flex gap-2 pb-1">
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
                className={`w-56 shrink-0 cursor-pointer rounded-lg border bg-white p-2.5 transition-all duration-150 dark:bg-[var(--card)] ${
                  highlighted
                    ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/25"
                    : "border-[var(--card-border)] hover:border-[var(--foreground)]/15 hover:shadow-sm"
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

                {lane.operator_name ? (
                  <p className="mt-1.5 flex items-center gap-1 truncate text-[10px] text-[var(--muted)]">
                    <User className="size-3 shrink-0" />
                    {lane.operator_name}
                  </p>
                ) : null}

                <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-[var(--muted)]">
                  <MapPin className="size-3 shrink-0" />
                  {lane.branch_name ?? "Branch"}
                </p>

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
                      · {hoursRemaining.toFixed(1)}h remaining
                      {(lane.idle_hours ?? 0) > 0.5 ? ` · ${lane.idle_hours?.toFixed(1)}h idle` : ""}
                    </p>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
                  <span className="flex items-center gap-0.5 rounded-md bg-[var(--card)] px-1.5 py-1 font-semibold">
                    <DollarSign className="size-2.5 text-emerald-600" />
                    {formatCurrency(lane.revenue_today ?? 0)}
                  </span>
                  {lane.fuel_level_pct != null ? (
                    <span className="flex items-center gap-0.5 rounded-md bg-[var(--card)] px-1.5 py-1 font-semibold">
                      <Fuel className="size-2.5" />
                      {Math.round(lane.fuel_level_pct)}% fuel
                    </span>
                  ) : null}
                </div>

                {currentJob ? (
                  <p className="mt-2 line-clamp-2 rounded-md border border-[var(--card-border)]/60 bg-[var(--card)]/50 px-1.5 py-1 text-[10px] font-medium leading-snug">
                    {currentJob.title}
                  </p>
                ) : status === "Available" ? (
                  <p className="mt-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Ready for assignment
                  </p>
                ) : null}

                {lane.maintenance_note ? (
                  <p className="mt-1 flex items-center gap-0.5 text-[9px] font-medium text-amber-800">
                    <AlertTriangle className="size-3" />
                    {lane.status === "maintenance" ? "In maintenance" : "Service due soon"}
                  </p>
                ) : null}

                {rec ? (
                  <p className="mt-1.5 flex items-center gap-1 rounded-md border border-blue-200 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:border-blue-800 dark:text-blue-400">
                    <Sparkles className="size-3" />
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
  );
}
