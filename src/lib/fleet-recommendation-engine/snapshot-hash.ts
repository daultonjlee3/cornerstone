import { createHash } from "crypto";
import type { FleetDispatchBoardData } from "@/src/types/fleet";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(",")}}`;
}

export function hashOperationalSnapshot(board: FleetDispatchBoardData): string {
  const payload = {
    date: board.date,
    jobs: [...board.jobs]
      .map((job) => ({
        id: job.id,
        status: job.status,
        assigned_truck_id: job.assigned_truck_id,
        required_truck_type: job.required_truck_type,
        scheduled_start: job.scheduled_start,
        scheduled_end: job.scheduled_end,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    trucks: [...board.truckLanes]
      .map((lane) => ({
        truck_id: lane.truck_id,
        status: lane.status,
        telematics_status: lane.telematics_status,
        maintenance_note: lane.maintenance_note ?? null,
        operator_id: lane.operator_id ?? null,
        operator_on_pto: lane.operator_on_pto ?? false,
        operator_daily_hours: lane.operator_daily_hours ?? 0,
        operator_weekly_hours: lane.operator_weekly_hours ?? 0,
        in_progress_jobs: lane.jobs
          .filter((j) => j.status === "in_progress")
          .map((j) => j.id)
          .sort(),
      }))
      .sort((a, b) => a.truck_id.localeCompare(b.truck_id)),
    branch_capacity: [...board.branchCapacity]
      .map((b) => ({
        branch_id: b.branch_id,
        committed_hours: b.committed_hours,
        available_truck_hours: b.available_truck_hours,
      }))
      .sort((a, b) => a.branch_id.localeCompare(b.branch_id)),
  };

  return createHash("sha256").update(stableStringify(payload)).digest("hex").slice(0, 16);
}
