import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { previewImport } from "@/src/lib/integrations/import-service";
import type { FieldMapping } from "@/src/lib/integrations/import-engine";
import type { ImportObjectType } from "@/src/lib/integrations/import-schemas";

export async function POST(request: Request) {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;

  const body = (await request.json()) as Record<string, unknown>;
  const objectType = String(body.object_type ?? "").trim() as ImportObjectType;
  if (!objectType) {
    return NextResponse.json({ error: "object_type is required" }, { status: 400 });
  }

  const preview = await previewImport({
    objectType,
    csvText: typeof body.csv_text === "string" ? body.csv_text : undefined,
    spreadsheetText: typeof body.spreadsheet_text === "string" ? body.spreadsheet_text : undefined,
    rows: Array.isArray(body.rows) ? (body.rows as Array<Record<string, unknown>>) : undefined,
    mappings: Array.isArray(body.mappings) ? (body.mappings as FieldMapping[]) : undefined,
  });
  return NextResponse.json(preview);
}
