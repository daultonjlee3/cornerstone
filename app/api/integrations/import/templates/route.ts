import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import {
  listMappingTemplates,
  saveMappingTemplate,
} from "@/src/lib/integrations/import-service";
import type { FieldMapping } from "@/src/lib/integrations/import-engine";
import type { ImportObjectType } from "@/src/lib/integrations/import-schemas";

export async function GET(request: Request) {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;
  const url = new URL(request.url);
  const objectType = (url.searchParams.get("object_type") ?? undefined) as ImportObjectType | undefined;
  const templates = await listMappingTemplates(context.supabase, context.auth.tenantId, objectType);
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;
  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const objectType = String(body.object_type ?? "").trim() as ImportObjectType;
  if (!name || !objectType) {
    return NextResponse.json({ error: "name and object_type are required" }, { status: 400 });
  }
  const template = await saveMappingTemplate(context.supabase, {
    tenantId: context.auth.tenantId,
    userId: context.auth.userId,
    name,
    objectType,
    provider: String(body.provider ?? "generic"),
    mappings: ((body.mappings as FieldMapping[]) ?? []),
    isDefault: Boolean(body.is_default),
  });
  return NextResponse.json({ template });
}
