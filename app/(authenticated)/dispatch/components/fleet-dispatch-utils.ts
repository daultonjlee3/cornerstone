import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetOperationalException,
  FleetRecommendationInstance,
  FleetTodayViewData,
} from "@/src/types/fleet";
import {
  recommendationConfidence,
  type RecommendationConfidence,
} from "../../operations/components/fleet-recommendation-utils";
import { buildRecommendationExplanation } from "@/src/lib/fleet-recommendation-engine/explainability";
import { computeJobProfitability } from "@/src/lib/operational-profitability/job-estimates";
import { syntheticOperatingRules } from "@/src/lib/operational-profitability/queries";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";

export type StatusSeverity = "critical" | "warning" | "opportunity" | "healthy" | "information";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Sum expected contribution from pending recommendations (dispatch AI opportunity). */
export function sumRecommendationContribution(
  recommendations: FleetRecommendationInstance[]
): number {
  return Math.round(
    recommendations.reduce(
      (sum, rec) => sum + (rec.rationale.candidate_snapshots?.[0]?.estimated_contribution ?? 0),
      0
    ) * 100
  ) / 100;
}

/** Fleet-wide utilization from branch capacity snapshots (0–100+). */
export function branchCapacityUtilizationPercent(board: FleetDispatchBoardData): number | null {
  const branches = board.branchCapacity.filter((b) => b.available_truck_hours > 0);
  if (branches.length === 0) return null;
  const available = branches.reduce((s, b) => s + b.available_truck_hours, 0);
  const committed = branches.reduce((s, b) => s + b.committed_hours, 0);
  if (available <= 0) return null;
  return Math.round((committed / available) * 10000) / 100;
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function jobDurationHours(job: FleetDispatchJob): number | null {
  if (!job.scheduled_start || !job.scheduled_end) return null;
  const start = Date.parse(job.scheduled_start);
  const end = Date.parse(job.scheduled_end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.round(((end - start) / (1000 * 60 * 60)) * 10) / 10;
}

export function isLateJob(job: FleetDispatchJob): boolean {
  if (job.status !== "scheduled" || !job.scheduled_start) return false;
  return Date.parse(job.scheduled_start) < Date.now();
}

/** Parse "Job type — Customer" from seeded job titles */
export function extractJobType(title: string): string {
  const parts = title.split(" — ");
  if (parts.length >= 2) return parts[0].replace(/^Emergency:\s*/i, "").replace(/^Late:\s*/i, "").trim();
  return title.split("·")[0]?.trim() ?? title;
}

export function extractCustomer(title: string, siteName: string | null): string {
  const parts = title.split(" — ");
  if (parts.length >= 2) return parts[parts.length - 1].trim();
  if (siteName) {
    const siteParts = siteName.split(" — ");
    return siteParts[0]?.trim() ?? siteName;
  }
  return "Customer";
}

export function operationalRiskMessage(job: FleetDispatchJob): string | null {
  if (isLateJob(job)) return "Customer waiting · dispatch window missed";
  if (job.priority === "urgent" && (job.status === "unassigned" || !job.assigned_truck_id)) {
    return `${formatCurrency(job.revenue_estimate)} at risk · SLA breach likely`;
  }
  if (job.priority === "high" && (job.status === "unassigned" || !job.assigned_truck_id)) {
    return "Service window at risk if not assigned soon";
  }
  if (job.status === "unassigned" && job.revenue_estimate >= 5000) {
    return `${formatCurrency(job.revenue_estimate)} revenue unassigned`;
  }
  return null;
}

export function priorityUrgencyClass(priority: FleetDispatchJob["priority"]): string {
  switch (priority) {
    case "urgent":
      return "border-l-[3px] border-l-red-600";
    case "high":
      return "border-l-[3px] border-l-amber-500";
    case "medium":
      return "border-l-[3px] border-l-sky-500";
    default:
      return "border-l-[3px] border-l-slate-300";
  }
}

export function confidenceTone(confidence: RecommendationConfidence): string {
  switch (confidence) {
    case "high":
      return "border border-emerald-300 text-emerald-800 dark:text-emerald-300";
    case "medium":
      return "border border-amber-300 text-amber-800 dark:text-amber-300";
    default:
      return "border border-slate-300 text-[var(--muted)]";
  }
}

export function severityTone(severity: StatusSeverity): {
  chip: string;
  dot: string;
} {
  switch (severity) {
    case "critical":
      return {
        chip: "border-[var(--card-border)] bg-white text-[var(--foreground)] dark:bg-[var(--card)]",
        dot: "bg-red-600",
      };
    case "warning":
      return {
        chip: "border-[var(--card-border)] bg-white text-[var(--foreground)] dark:bg-[var(--card)]",
        dot: "bg-amber-500",
      };
    case "opportunity":
      return {
        chip: "border-[var(--card-border)] bg-white text-[var(--foreground)] dark:bg-[var(--card)]",
        dot: "bg-blue-600",
      };
    case "healthy":
      return {
        chip: "border-[var(--card-border)] bg-white text-[var(--foreground)] dark:bg-[var(--card)]",
        dot: "bg-emerald-600",
      };
    default:
      return {
        chip: "border-[var(--card-border)] bg-white text-[var(--foreground)] dark:bg-[var(--card)]",
        dot: "bg-slate-400",
      };
  }
}

export function telematicsTone(status: FleetDispatchTruckLane["telematics_status"]): string {
  switch (status) {
    case "online":
      return "border border-emerald-300 text-emerald-800 dark:text-emerald-400";
    case "stale":
      return "border border-amber-300 text-amber-800 dark:text-amber-400";
    default:
      return "border border-red-300 text-red-700 dark:text-red-400";
  }
}

export function utilizationTone(utilization: number): string {
  if (utilization >= 1) return "bg-red-500";
  if (utilization >= 0.8) return "bg-amber-500";
  if (utilization >= 0.5) return "bg-sky-500";
  return "bg-emerald-500";
}

export function utilizationDisplay(lane: FleetDispatchTruckLane): {
  pct: number;
  barPct: number;
  label: string;
  explanation: string | null;
} {
  const pct = Math.round(lane.utilization * 100);
  const barPct = Math.min(100, Math.max(4, pct));
  if (pct > 100) {
    return {
      pct,
      barPct: 100,
      label: `${pct}%`,
      explanation: "Over-committed — multiple jobs overlap today",
    };
  }
  if (pct >= 80) {
    return {
      pct,
      barPct,
      label: `${pct}%`,
      explanation: "Near capacity — limited slack for new assignments",
    };
  }
  if (pct < 15 && lane.jobs.length === 0) {
    return {
      pct,
      barPct,
      label: `${pct}%`,
      explanation: "Available for dispatch",
    };
  }
  return { pct, barPct, label: `${pct}%`, explanation: null };
}

export function truckStatusLabel(lane: FleetDispatchTruckLane): string {
  if (lane.status === "maintenance") return "Maintenance";
  if (lane.telematics_status === "offline") return "Offline";
  if (lane.jobs.some((j) => j.status === "in_progress")) return "Working";
  if (lane.jobs.length > 0) return "Scheduled";
  if (lane.utilization < 0.3) return "Available";
  return "Idle";
}

export function recommendationForJob(
  jobId: string,
  recommendations: FleetRecommendationInstance[]
): FleetRecommendationInstance | undefined {
  return recommendations.find((r) => r.rationale.entities.job_id === jobId);
}

export function recommendationForTruck(
  truckId: string,
  recommendations: FleetRecommendationInstance[]
): FleetRecommendationInstance | undefined {
  return recommendations.find(
    (r) =>
      r.rationale.entities.truck_id === truckId ||
      r.rationale.candidates?.some((c) => c.truck_id === truckId)
  );
}

export type RecommendationImpact = {
  revenueOpportunity: number | null;
  deadheadMilesSaved: number | null;
  minutesSaved: number | null;
  capacityLabel: string | null;
  idleLabel: string | null;
  gpsConfidence: number | null;
};

export function recommendationImpact(
  rec: FleetRecommendationInstance,
  board: FleetDispatchBoardData
): RecommendationImpact {
  const jobId = rec.rationale.entities.job_id;
  const job = jobId ? board.jobs.find((j) => j.id === jobId) : undefined;
  const factors = rec.rationale.factors;
  const top = rec.rationale.candidates?.[0];
  const alt = rec.rationale.candidates?.[1];

  let deadheadMilesSaved: number | null = null;
  if (job?.estimated_deadhead_miles != null && alt && top) {
    const spread = Math.max(0, (alt.score - top.score) / 100);
    deadheadMilesSaved = Math.round(job.estimated_deadhead_miles * spread * 10) / 10;
  } else if (job?.estimated_deadhead_miles != null && factors.travelImpact >= 70) {
    deadheadMilesSaved = Math.round(job.estimated_deadhead_miles * 0.25 * 10) / 10;
  }

  let minutesSaved: number | null = null;
  if (job?.estimated_travel_minutes != null && factors.travelImpact >= 65) {
    minutesSaved = Math.round(job.estimated_travel_minutes * (factors.travelImpact / 100) * 0.35);
  }

  return {
    revenueOpportunity: job?.revenue_estimate ?? null,
    deadheadMilesSaved,
    minutesSaved,
    capacityLabel:
      factors.capacityImpact >= 75
        ? "Improves branch balance"
        : factors.capacityImpact >= 50
          ? "Capacity manageable"
          : null,
    idleLabel: rec.recommendation_type === "idle_truck_match" ? "Uses idle capacity" : null,
    gpsConfidence: factors.telematicsFreshness ?? null,
  };
}

export function recommendationOutcomes(
  rec: FleetRecommendationInstance,
  impact: RecommendationImpact
): { ifAccepted: string; ifDismissed: string } {
  const isCapacity = rec.recommendation_type === "capacity_overload";
  const isIdle = rec.recommendation_type === "idle_truck_match";
  const truck = rec.rationale.candidates?.[0]?.unit_number;

  if (isCapacity) {
    return {
      ifAccepted: "Ops acknowledges overload — rebalance or defer lower-priority work",
      ifDismissed: "Capacity risk remains — monitor branch for missed assignments",
    };
  }
  if (isIdle) {
    return {
      ifAccepted: truck
        ? `Truck ${truck} assigned · idle hours converted to billable work`
        : "Idle truck matched to open job",
      ifDismissed: "Truck stays idle · revenue opportunity deferred",
    };
  }
  const parts: string[] = [];
  if (truck) parts.push(`Truck ${truck} assigned`);
  if (impact.revenueOpportunity) parts.push(`${formatCurrency(impact.revenueOpportunity)} captured`);
  if (impact.minutesSaved) parts.push(`~${impact.minutesSaved} min travel saved`);

  return {
    ifAccepted: parts.length > 0 ? parts.join(" · ") : "Job assigned to recommended truck",
    ifDismissed: impact.revenueOpportunity
      ? `${formatCurrency(impact.revenueOpportunity)} remains at risk · manual assignment needed`
      : "Manual assignment required · recommendation ignored",
  };
}

export type DispatchStatusItem = {
  id: string;
  label: string;
  detail?: string;
  severity: StatusSeverity;
  targetId: string;
  priority: number;
};

const SEVERITY_PRIORITY: Record<StatusSeverity, number> = {
  critical: 0,
  warning: 1,
  opportunity: 2,
  information: 3,
  healthy: 4,
};

export function buildDispatchStatusItems(
  board: FleetDispatchBoardData,
  intel: FleetTodayViewData,
  recommendations: FleetRecommendationInstance[]
): DispatchStatusItem[] {
  const items: DispatchStatusItem[] = [];

  const urgentJobs = board.jobs.filter(
    (j) =>
      j.priority === "urgent" &&
      (j.status === "unassigned" || !j.assigned_truck_id || isLateJob(j))
  );
  if (urgentJobs.length > 0) {
    items.push({
      id: "urgent",
      label: `${urgentJobs.length} Urgent`,
      detail: "Requires immediate assignment",
      severity: "critical",
      targetId: "fleet-job-queue",
      priority: 0,
    });
  }

  const criticalExceptions = intel.exceptions.filter((e) => e.severity === "critical").length;
  if (criticalExceptions > 0 && urgentJobs.length === 0) {
    items.push({
      id: "critical-ex",
      label: `${criticalExceptions} Critical Issue${criticalExceptions === 1 ? "" : "s"}`,
      severity: "critical",
      targetId: "fleet-exceptions",
      priority: 1,
    });
  }

  const lateJobs = board.jobs.filter((j) => isLateJob(j));
  if (lateJobs.length > 0) {
    items.push({
      id: "late",
      label: `${lateJobs.length} Late`,
      detail: "Past scheduled start",
      severity: "warning",
      targetId: "fleet-job-queue",
      priority: 2,
    });
  }

  const offlineTrucks = board.truckLanes.filter((l) => l.telematics_status === "offline");
  if (offlineTrucks.length > 0) {
    items.push({
      id: "offline",
      label: `${offlineTrucks.length} Offline`,
      detail: "GPS unavailable",
      severity: "warning",
      targetId: "fleet-dispatch-map",
      priority: 3,
    });
  }

  const overloaded = board.branchCapacity.filter((b) => b.utilization >= 1);
  for (const branch of overloaded.slice(0, 1)) {
    items.push({
      id: `capacity-${branch.branch_id}`,
      label: `${branch.branch_name} ${Math.round(branch.utilization * 100)}%`,
      detail: "Branch over capacity",
      severity: "warning",
      targetId: "fleet-capacity",
      priority: 4,
    });
  }

  const integrationIssues = intel.integrationHealth.filter((c) => c.status !== "healthy");
  if (integrationIssues.length > 0) {
    items.push({
      id: "integration",
      label: `${integrationIssues.length} Integration`,
      detail: "Sync attention needed",
      severity: "warning",
      targetId: "fleet-exceptions",
      priority: 5,
    });
  }

  if (board.unassignedJobs.length > 0 && urgentJobs.length === 0) {
    items.push({
      id: "unassigned",
      label: `${board.unassignedJobs.length} Unassigned`,
      severity: "warning",
      targetId: "fleet-job-queue",
      priority: 6,
    });
  }

  if (recommendations.length > 0) {
    items.push({
      id: "recommendations",
      label: `${recommendations.length} Ready`,
      detail: "Actionable recommendations",
      severity: "opportunity",
      targetId: "fleet-recommendations",
      priority: 7,
    });
  }

  if (intel.revenueAtRisk > 0) {
    items.push({
      id: "revenue-risk",
      label: formatCurrency(intel.revenueAtRisk),
      detail: "Revenue at risk",
      severity: "opportunity",
      targetId: "fleet-executive",
      priority: 8,
    });
  }

  const onlineCount = board.truckLanes.filter((l) => l.telematics_status === "online").length;
  const gpsPct =
    board.truckLanes.length > 0 ? Math.round((onlineCount / board.truckLanes.length) * 100) : 0;
  items.push({
    id: "gps",
    label: `GPS ${gpsPct}%`,
    severity: gpsPct >= 90 ? "healthy" : gpsPct >= 70 ? "information" : "warning",
    targetId: "fleet-dispatch-map",
    priority: 9,
  });

  const availableTrucks = board.truckLanes.filter(
    (l) => l.jobs.length === 0 && l.utilization < 0.4 && l.status === "active"
  ).length;
  if (availableTrucks > 0) {
    items.push({
      id: "available",
      label: `${availableTrucks} Available`,
      severity: "healthy",
      targetId: "fleet-dispatch-map",
      priority: 10,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export type GroupedException = {
  category: FleetOperationalException["category"];
  label: string;
  count: number;
  severity: FleetOperationalException["severity"];
  items: FleetOperationalException[];
};

const CATEGORY_LABELS: Record<FleetOperationalException["category"], string> = {
  unassigned_job: "Unassigned jobs",
  capacity: "Capacity overload",
  idle_truck: "Idle trucks",
  telematics: "GPS / telematics",
  integration: "Integrations",
  revenue: "Revenue at risk",
  dispatch: "Dispatch issues",
  gps: "Missing locations",
};

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

export function groupExceptions(exceptions: FleetOperationalException[]): GroupedException[] {
  const byCategory = new Map<FleetOperationalException["category"], FleetOperationalException[]>();
  for (const ex of exceptions) {
    const list = byCategory.get(ex.category) ?? [];
    list.push(ex);
    byCategory.set(ex.category, list);
  }

  return [...byCategory.entries()]
    .map(([category, items]) => {
      const sorted = [...items].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      );
      return {
        category,
        label: CATEGORY_LABELS[category] ?? category,
        count: items.length,
        severity: sorted[0]?.severity ?? "info",
        items: sorted,
      };
    })
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

export function jobEstimatedProfit(
  job: FleetDispatchJob,
  ctx?: ProfitabilityContext
): number {
  const profitCtx =
    ctx ??
    ({
      rules: syntheticOperatingRules(job.branch_id, job.branch_id),
      truckProfiles: new Map(),
      typeProfiles: new Map(),
      operatorDailyHours: new Map(),
      operatorWeeklyHours: new Map(),
    } satisfies ProfitabilityContext);
  return computeJobProfitability({ job, ctx: profitCtx }).estimated_contribution;
}

export function recommendationIgnoreRisk(
  rec: FleetRecommendationInstance,
  board: FleetDispatchBoardData
): string | null {
  return buildRecommendationExplanation(rec, board).ignoreRisk;
}

export function recommendationConfidenceExplanation(
  rec: FleetRecommendationInstance,
  board: FleetDispatchBoardData
): string {
  return buildRecommendationExplanation(rec, board).confidenceExplanation;
}

export function truckHoursRemaining(lane: FleetDispatchTruckLane): number {
  return Math.max(0, Math.round((lane.available_hours - lane.committed_hours) * 10) / 10);
}

export function truckGpsLabel(status: FleetDispatchTruckLane["telematics_status"]): string {
  switch (status) {
    case "online":
      return "Current";
    case "stale":
      return "Delayed";
    default:
      return "Offline";
  }
}

export { recommendationConfidence };
