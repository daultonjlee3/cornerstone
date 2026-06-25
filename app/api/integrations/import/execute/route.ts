import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { executeImport } from "@/src/lib/integrations/import-service";
import type { FieldMapping } from "@/src/lib/integrations/import-engine";
import type { ImportObjectType } from "@/src/lib/integrations/import-schemas";

export async function POST(request: Request) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;

  const body = (await request.json()) as Record<string, unknown>;
  const objectType = String(body.object_type ?? "").trim() as ImportObjectType;
  if (!objectType) {
    return NextResponse.json({ error: "object_type is required" }, { status: 400 });
  }

  const result = await executeImport(context.supabase, {
    tenantId: context.auth.tenantId,
    userId: context.auth.userId,
    objectType,
    source: (String(body.source ?? "manual") as "csv" | "spreadsheet" | "rest" | "manual"),
    csvText: typeof body.csv_text === "string" ? body.csv_text : undefined,
    spreadsheetText: typeof body.spreadsheet_text === "string" ? body.spreadsheet_text : undefined,
    rows: Array.isArray(body.rows) ? (body.rows as Array<Record<string, unknown>>) : undefined,
    mappings: Array.isArray(body.mappings) ? (body.mappings as FieldMapping[]) : undefined,
    mappingTemplateId:
      typeof body.mapping_template_id === "string" ? body.mapping_template_id : undefined,
    connectionId: typeof body.connection_id === "string" ? body.connection_id : undefined,
  });
  return NextResponse.json(result);
}
