import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import {
  listFieldMappings,
  saveFieldMappings,
} from "@/src/lib/integrations/import-service";
import type { ImportObjectType } from "@/src/lib/integrations/import-schemas";

export async function GET(request: Request) {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;

  const url = new URL(request.url);
  const objectType = (url.searchParams.get("object_type") ?? undefined) as ImportObjectType | undefined;
  const connectionId = url.searchParams.get("connection_id") ?? undefined;
  const templateId = url.searchParams.get("template_id") ?? undefined;
  const mappings = await listFieldMappings(context.supabase, {
    tenantId: context.auth.tenantId,
    objectType,
    connectionId,
    templateId,
  });
  return NextResponse.json({ mappings });
}

export async function POST(request: Request) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;

  const body = (await request.json()) as Record<string, unknown>;
  const objectType = String(body.object_type ?? "").trim() as ImportObjectType;
  if (!objectType || !Array.isArray(body.mappings)) {
    return NextResponse.json({ error: "object_type and mappings are required" }, { status: 400 });
  }

  await saveFieldMappings(context.supabase, {
    tenantId: context.auth.tenantId,
    objectType,
    mappings: body.mappings as Array<{
      sourceField: string;
      targetField: string;
      transformKey?: string | null;
      required?: boolean;
    }>,
    connectionId: typeof body.connection_id === "string" ? body.connection_id : null,
    templateId: typeof body.template_id === "string" ? body.template_id : null,
  });

  return NextResponse.json({ ok: true });
}
