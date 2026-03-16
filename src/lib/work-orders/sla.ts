// Use the canonical type from the domain model so priorities stay in sync.
import type { WorkOrderPriority } from "@/src/types/work-order";
/** @deprecated Use WorkOrderPriority from src/types/work-order directly. */
export type WorkOrderSlaPriority = WorkOrderPriority;

export type WorkOrderSlaPolicyRow = {
  company_id: string;
  priority: string;
  response_target_minutes: number;
};

export type WorkOrderSlaSnapshot = {
  responseTargetMinutes: number;
  responseDueAt: string | null;
  responseTimeMinutes: number | null;
  resolutionTimeMinutes: number | null;
  responseBreached: boolean;
  responsePending: boolean;
  responseExceededByMinutes: number | null;
};

const DEFAULT_RESPONSE_TARGET_MINUTES: Record<WorkOrderSlaPriority, number> = {
  emergency: 60,
  urgent: 120,
  high: 240,
  medium: 1440,
  low: 4320,
};

function toPriority(input: string | null | undefined): WorkOrderSlaPriority {
  const normalized = String(input ?? "medium").toLowerCase();
  if (normalized === "emergency") return "emergency";
  if (normalized === "urgent") return "urgent";
  if (normalized === "high") return "high";
  if (normalized === "low") return "low";
  return "medium";
}

function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function defaultResponseTargetMinutesForPriority(
  priority: string | null | undefined
): number {
  return DEFAULT_RESPONSE_TARGET_MINUTES[toPriority(priority)];
}

export function groupSlaPoliciesByCompany(
  rows: WorkOrderSlaPolicyRow[]
): Map<string, Map<WorkOrderSlaPriority, number>> {
  const byCompany = new Map<string, Map<WorkOrderSlaPriority, number>>();
  for (const row of rows) {
    const companyId = String(row.company_id ?? "");
    if (!companyId) continue;
    const mapForCompany =
      byCompany.get(companyId) ?? new Map<WorkOrderSlaPriority, number>();
    mapForCompany.set(
      toPriority(row.priority),
      Math.max(1, Math.round(Number(row.response_target_minutes ?? 0)))
    );
    byCompany.set(companyId, mapForCompany);
  }
  return byCompany;
}

export function resolveResponseTargetMinutes(
  priority: string | null | undefined,
  companyPolicyMap?: Map<WorkOrderSlaPriority, number> | null
): number {
  const key = toPriority(priority);
  return (
    companyPolicyMap?.get(key) ?? DEFAULT_RESPONSE_TARGET_MINUTES[key]
  );
}

export function calculateWorkOrderSlaSnapshot(args: {
  priority: string | null | undefined;
  createdAt: string | null | undefined;
  firstResponseAt: string | null | undefined;
  completedAt: string | null | undefined;
  responseTimeMinutes?: number | null | undefined;
  resolutionTimeMinutes?: number | null | undefined;
  companyPolicyMap?: Map<WorkOrderSlaPriority, number> | null;
  now?: Date;
}): WorkOrderSlaSnapshot {
  const {
    priority,
    createdAt,
    firstResponseAt,
    completedAt,
    responseTimeMinutes,
    resolutionTimeMinutes,
    companyPolicyMap,
    now = new Date(),
  } = args;

  const createdMs = toMs(createdAt);
  const firstResponseMs = toMs(firstResponseAt);
  const completedMs = toMs(completedAt);
  const nowMs = now.getTime();
  const responseTargetMinutes = resolveResponseTargetMinutes(
    priority,
    companyPolicyMap
  );

  const responseDueMs =
    createdMs != null ? createdMs + responseTargetMinutes * 60_000 : null;
  const responseDueAt =
    responseDueMs != null ? new Date(responseDueMs).toISOString() : null;

  const computedResponseMinutes =
    createdMs != null && firstResponseMs != null
      ? Math.max(0, Math.floor((firstResponseMs - createdMs) / 60_000))
      : null;
  const computedResolutionMinutes =
    createdMs != null && completedMs != null
      ? Math.max(0, Math.floor((completedMs - createdMs) / 60_000))
      : null;

  const finalResponseMinutes =
    responseTimeMinutes != null ? Number(responseTimeMinutes) : computedResponseMinutes;
  const finalResolutionMinutes =
    resolutionTimeMinutes != null
      ? Number(resolutionTimeMinutes)
      : computedResolutionMinutes;

  const responsePending = firstResponseMs == null;
  const responseBreached =
    responseDueMs != null
      ? responsePending
        ? nowMs > responseDueMs
        : firstResponseMs > responseDueMs
      : false;
  const responseExceededByMinutes =
    responseDueMs != null
      ? responsePending
        ? Math.max(0, Math.floor((nowMs - responseDueMs) / 60_000))
        : Math.max(0, Math.floor((firstResponseMs - responseDueMs) / 60_000))
      : null;

  return {
    responseTargetMinutes,
    responseDueAt,
    responseTimeMinutes: finalResponseMinutes,
    resolutionTimeMinutes: finalResolutionMinutes,
    responseBreached,
    responsePending,
    responseExceededByMinutes:
      responseExceededByMinutes != null && responseExceededByMinutes > 0
        ? responseExceededByMinutes
        : null,
  };
}
