import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditLogPayload = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  timestamp?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function insertAuditLog(
  supabase: SupabaseClient,
  payload: AuditLogPayload
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    user_id: payload.userId ?? null,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}
