import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { ingestViaRest } from "@/src/lib/integrations/rest-ingestion";
import type { ImportObjectType } from "@/src/lib/integrations/import-schemas";

export async function POST(request: Request) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;

  const body = (await request.json()) as Record<string, unknown>;
  const objectType = String(body.object_type ?? "").trim() as ImportObjectType;
  const rows = Array.isArray(body.rows) ? (body.rows as Array<Record<string, unknown>>) : null;

  if (!objectType || !rows) {
    return NextResponse.json(
      { ok: false, status: "failed", errors: [{ code: "bad_request", message: "object_type and rows are required" }] },
      { status: 400 }
    );
  }

  const result = await ingestViaRest(context.supabase, {
    tenantId: context.auth.tenantId,
    userId: context.auth.userId,
    objectType,
    rows,
    dryRun: Boolean(body.dry_run),
    mappingTemplateId:
      typeof body.mapping_template_id === "string" ? body.mapping_template_id : undefined,
    connectionId: typeof body.connection_id === "string" ? body.connection_id : undefined,
  });

  return NextResponse.json(result);
}
