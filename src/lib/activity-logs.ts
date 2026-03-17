import { insertAuditLog } from "@/src/lib/audit-logs";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityLogPayload = {
  tenantId?: string | null;
  companyId?: string | null;
  entityType: string;
  entityId: string;
  actionType: string;
  performedBy?: string | null;
  metadata?: Record<string, unknown> | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  performedAt?: string | null;
};

function normalizeAuditAction(payload: ActivityLogPayload): string {
  const action = payload.actionType;
  if (payload.entityType === "work_order") {
    if (action === "work_order_created") return "work_order_created";
    if (action === "work_order_assigned" || action === "work_order.assigned") {
      return "work_order_assigned";
    }
    if (action.includes("assigned")) return "work_order_assigned";
    if (action === "work_order_edited" || action === "work_order_status_changed") {
      return "work_order_updated";
    }
  }
  if (payload.entityType === "asset" && (action === "asset_edited" || action === "asset_created")) {
    return "asset_modified";
  }
  if (payload.entityType === "work_request" && action === "request.created") {
    return "maintenance_request_created";
  }
  return action;
}

export async function insertActivityLog(
  supabase: SupabaseClient,
  payload: ActivityLogPayload
): Promise<void> {
  const { error } = await supabase.from("activity_logs").insert({
    tenant_id: payload.tenantId ?? null,
    company_id: payload.companyId ?? null,
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    action_type: payload.actionType,
    performed_by: payload.performedBy ?? null,
    performed_at: payload.performedAt ?? new Date().toISOString(),
    metadata: payload.metadata ?? {},
    before_state: payload.beforeState ?? null,
    after_state: payload.afterState ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  await insertAuditLog(supabase, {
    userId: payload.performedBy ?? null,
    action: normalizeAuditAction(payload),
    entityType: payload.entityType,
    entityId: payload.entityId,
    timestamp: payload.performedAt ?? new Date().toISOString(),
    metadata: {
      tenant_id: payload.tenantId ?? null,
      company_id: payload.companyId ?? null,
      activity_action: payload.actionType,
      before_state: payload.beforeState ?? null,
      after_state: payload.afterState ?? null,
      metadata: payload.metadata ?? {},
    },
  });
}
