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

export async function insertActivityLog(
  supabase: { from: (table: string) => any },
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
}
