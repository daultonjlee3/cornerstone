import type { SupabaseClient } from "@supabase/supabase-js";
import { executeImport, previewImport } from "@/src/lib/integrations/import-service";
import type { ImportObjectType } from "@/src/lib/integrations/import-schemas";

export type RestIngestionResponse = {
  ok: boolean;
  status: "accepted" | "validated" | "failed";
  batchId?: string;
  summary?: Record<string, unknown>;
  errors?: Array<{ code: string; message: string }>;
};

export async function ingestViaRest(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    userId: string | null;
    objectType: ImportObjectType;
    rows: Array<Record<string, unknown>>;
    dryRun?: boolean;
    mappingTemplateId?: string | null;
    connectionId?: string | null;
  }
): Promise<RestIngestionResponse> {
  const preview = await previewImport({
    objectType: input.objectType,
    rows: input.rows,
  });

  if (input.dryRun) {
    return {
      ok: true,
      status: "validated",
      summary: {
        validation: preview.validation.summary,
        autoMappings: preview.mappings.length,
      },
    };
  }

  const execution = await executeImport(supabase, {
    tenantId: input.tenantId,
    userId: input.userId,
    objectType: input.objectType,
    source: "rest",
    rows: input.rows,
    mappings: preview.mappings,
    mappingTemplateId: input.mappingTemplateId ?? null,
    connectionId: input.connectionId ?? null,
  });

  return {
    ok: true,
    status: "accepted",
    batchId: execution.batchId,
    summary: execution.summary,
    errors: execution.limitations.map((message) => ({
      code: "limitation",
      message,
    })),
  };
}
