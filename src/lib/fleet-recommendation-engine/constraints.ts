import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
} from "@/src/types/fleet";
import type { CompanyOperatingRules } from "@/src/lib/operational-profitability/types";
import { parseJobHours } from "./scoring-utils";

/**
 * Anchor constraint checks to the dispatch board day when wall-clock time is on
 * a different calendar day (planning ahead, replay, or test fixtures).
 */
export function operationalNowForBoard(
  board: FleetDispatchBoardData,
  wallNow: Date = new Date()
): Date {
  const boardDate = board.date;
  if (!boardDate) return wallNow;

  const wallDateUtc = wallNow.toISOString().slice(0, 10);
  if (wallDateUtc === boardDate) {
    return wallNow;
  }

  return new Date(`${boardDate}T06:00:00.000Z`);
}

/** Hard constraints immediately eliminate a truck from consideration */
export type HardConstraintCode =
  | "truck_not_found"
  | "truck_inactive"
  | "truck_maintenance"
  | "truck_wrong_equipment"
  | "truck_already_dispatched"
  | "truck_gps_offline"
  | "job_not_found"
  | "job_closed"
  | "job_already_assigned"
  | "job_not_assignable"
  | "sla_window_passed"
  | "board_date_mismatch"
  | "snapshot_hash_mismatch"
  | "driver_on_pto"
  | "driver_not_assigned"
  | "certification_missing"
  | "daily_overtime_exceeded"
  | "weekly_overtime_exceeded";

export type HardConstraintViolation = {
  ok: false;
  hard: true;
  code: HardConstraintCode;
  message: string;
};

export type HardConstraintPass = { ok: true; hard: true };

export type HardConstraintResult = HardConstraintPass | HardConstraintViolation;

export function isJobAssignable(
  job: FleetDispatchJob,
  board: FleetDispatchBoardData,
  now: Date = new Date()
): HardConstraintResult {
  if (job.status === "cancelled" || job.status === "completed") {
    return {
      ok: false,
      hard: true,
      code: "job_closed",
      message: `Job is ${job.status} and cannot be assigned.`,
    };
  }

  const needsFreshAssignment =
    job.status === "unassigned" && !job.assigned_truck_id;

  if (
    needsFreshAssignment &&
    job.scheduled_end &&
    Date.parse(job.scheduled_end) < now.getTime()
  ) {
    return {
      ok: false,
      hard: true,
      code: "sla_window_passed",
      message: "Job SLA window has already passed.",
    };
  }

  if (
    job.assigned_truck_id &&
    job.status !== "unassigned" &&
    job.status !== "scheduled" &&
    job.status !== "in_progress"
  ) {
    return {
      ok: false,
      hard: true,
      code: "job_not_assignable",
      message: "Job is no longer available for assignment.",
    };
  }

  if (!board.jobs.some((j) => j.id === job.id)) {
    return {
      ok: false,
      hard: true,
      code: "job_not_found",
      message: "Job is not on the dispatch board.",
    };
  }

  return { ok: true, hard: true };
}

const CERTIFICATIONS_BY_TRUCK_TYPE: Record<string, string[]> = {
  hydrovac: ["CDL-A"],
  vacuum: ["CDL-A"],
};

export function evaluateOperatorHardConstraints(args: {
  job: FleetDispatchJob;
  lane: FleetDispatchTruckLane;
  operatingRules?: Pick<
    CompanyOperatingRules,
    "daily_overtime_threshold" | "weekly_overtime_threshold"
  >;
  jobHours?: number;
}): HardConstraintResult {
  const { job, lane } = args;
  const jobHours = args.jobHours ?? parseJobHours(job);

  if (lane.operator_on_pto) {
    return {
      ok: false,
      hard: true,
      code: "driver_on_pto",
      message: `Operator ${lane.operator_name ?? "assigned driver"} is on PTO.`,
    };
  }

  if (!lane.operator_id && !lane.operator_name) {
    return {
      ok: false,
      hard: true,
      code: "driver_not_assigned",
      message: `Truck ${lane.unit_number} has no assigned operator.`,
    };
  }

  if (lane.operator_id && job.required_truck_type !== "any") {
    const qualifications = lane.operator_truck_qualifications ?? [];
    if (
      qualifications.length > 0 &&
      !qualifications.includes(job.required_truck_type) &&
      lane.truck_type !== job.required_truck_type
    ) {
      return {
        ok: false,
        hard: true,
        code: "certification_missing",
        message: `Operator is not qualified for ${job.required_truck_type} equipment.`,
      };
    }

    const requiredCerts = CERTIFICATIONS_BY_TRUCK_TYPE[job.required_truck_type] ?? [];
    const operatorCerts = lane.operator_certifications ?? [];
    const missing = requiredCerts.filter((cert) => !operatorCerts.includes(cert));
    if (missing.length > 0) {
      return {
        ok: false,
        hard: true,
        code: "certification_missing",
        message: `Operator is missing required certification(s): ${missing.join(", ")}.`,
      };
    }
  }

  const dailyThreshold = args.operatingRules?.daily_overtime_threshold ?? 8;
  const weeklyThreshold = args.operatingRules?.weekly_overtime_threshold ?? 40;
  const dailyHours = lane.operator_daily_hours ?? 0;
  const weeklyHours = lane.operator_weekly_hours ?? 0;

  if (lane.operator_id && dailyHours + jobHours > dailyThreshold + 0.01) {
    return {
      ok: false,
      hard: true,
      code: "daily_overtime_exceeded",
      message: `Operator would exceed daily hours limit (${dailyThreshold}h).`,
    };
  }

  if (lane.operator_id && weeklyHours + jobHours > weeklyThreshold + 0.01) {
    return {
      ok: false,
      hard: true,
      code: "weekly_overtime_exceeded",
      message: `Operator would exceed weekly hours limit (${weeklyThreshold}h).`,
    };
  }

  return { ok: true, hard: true };
}

export function evaluateTruckJobHardConstraints(args: {
  job: FleetDispatchJob;
  lane: FleetDispatchTruckLane;
  board?: FleetDispatchBoardData;
  now?: Date;
  operatingRules?: Pick<
    CompanyOperatingRules,
    "daily_overtime_threshold" | "weekly_overtime_threshold"
  >;
  /** When validating an existing assignment to this truck, allow already-assigned state */
  allowAssignedToThisTruck?: boolean;
}): HardConstraintResult {
  const { job, lane } = args;
  const now =
    args.now ??
    (args.board ? operationalNowForBoard(args.board) : new Date());

  if (lane.status !== "active") {
    return {
      ok: false,
      hard: true,
      code: lane.status === "maintenance" ? "truck_maintenance" : "truck_inactive",
      message:
        lane.status === "maintenance"
          ? `Truck ${lane.unit_number} is in maintenance.`
          : `Truck ${lane.unit_number} is not active (${lane.status}).`,
    };
  }

  if (lane.maintenance_note) {
    return {
      ok: false,
      hard: true,
      code: "truck_maintenance",
      message: `Truck ${lane.unit_number} has a PM conflict (${lane.maintenance_note}).`,
    };
  }

  if (job.required_truck_type !== "any" && lane.truck_type !== job.required_truck_type) {
    return {
      ok: false,
      hard: true,
      code: "truck_wrong_equipment",
      message: `Truck ${lane.unit_number} does not match required equipment (${job.required_truck_type}).`,
    };
  }

  if (lane.telematics_status === "offline") {
    return {
      ok: false,
      hard: true,
      code: "truck_gps_offline",
      message: `Truck ${lane.unit_number} GPS is offline.`,
    };
  }

  const assignedElsewhere =
    job.assigned_truck_id && job.assigned_truck_id !== lane.truck_id;
  if (assignedElsewhere && !args.allowAssignedToThisTruck) {
    return {
      ok: false,
      hard: true,
      code: "job_already_assigned",
      message: "Job is already assigned to another truck.",
    };
  }

  const inProgressElsewhere = lane.jobs.some(
    (assigned) => assigned.status === "in_progress" && assigned.id !== job.id
  );
  if (inProgressElsewhere) {
    return {
      ok: false,
      hard: true,
      code: "truck_already_dispatched",
      message: `Truck ${lane.unit_number} is already dispatched on another job.`,
    };
  }

  const jobCheck = isJobAssignable(job, args.board ?? { date: "", jobs: [job], unassignedJobs: [], truckLanes: [lane], branchCapacity: [] }, now);
  if (!jobCheck.ok) return jobCheck;

  const operatorCheck = evaluateOperatorHardConstraints({
    job,
    lane,
    operatingRules: args.operatingRules,
  });
  if (!operatorCheck.ok) return operatorCheck;

  return { ok: true, hard: true };
}

export function filterEligibleTrucksForJob(
  job: FleetDispatchJob,
  board: FleetDispatchBoardData,
  now?: Date,
  operatingRules?: Pick<
    CompanyOperatingRules,
    "daily_overtime_threshold" | "weekly_overtime_threshold"
  >
): FleetDispatchTruckLane[] {
  return board.truckLanes.filter((lane) => {
    const result = evaluateTruckJobHardConstraints({ job, lane, board, now, operatingRules });
    return result.ok;
  });
}

export function countHardConstraintsForTruckJob(
  job: FleetDispatchJob,
  lane: FleetDispatchTruckLane,
  board: FleetDispatchBoardData,
  now?: Date
): number {
  const result = evaluateTruckJobHardConstraints({ job, lane, board, now });
  return result.ok ? 0 : 1;
}
