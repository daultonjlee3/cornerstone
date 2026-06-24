import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExternalEntityType } from "@/src/types/fleet";

export async function upsertExternalMapping(
  supabase: SupabaseClient,
  input: {
    connectionId: string;
    tenantId: string;
    entityType: ExternalEntityType;
    externalId: string;
    internalId: string;
  }
): Promise<void> {
  const { error } = await supabase.from("external_entity_mappings").upsert(
    {
      connection_id: input.connectionId,
      tenant_id: input.tenantId,
      entity_type: input.entityType,
      external_id: input.externalId,
      internal_id: input.internalId,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "connection_id,entity_type,external_id" }
  );

  if (error) throw new Error(error.message);
}

export async function resolveExternalMapping(
  supabase: SupabaseClient,
  connectionId: string,
  entityType: ExternalEntityType,
  externalId: string,
  tenantId?: string
): Promise<string | null> {
  let query = supabase
    .from("external_entity_mappings")
    .select("internal_id")
    .eq("connection_id", connectionId)
    .eq("entity_type", entityType)
    .eq("external_id", externalId);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data } = await query.maybeSingle();

  return (data as { internal_id?: string } | null)?.internal_id ?? null;
}

export async function deleteMappingsForInternalId(
  supabase: SupabaseClient,
  tenantId: string,
  entityType: ExternalEntityType,
  internalId: string
): Promise<void> {
  await supabase
    .from("external_entity_mappings")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("entity_type", entityType)
    .eq("internal_id", internalId);
}
