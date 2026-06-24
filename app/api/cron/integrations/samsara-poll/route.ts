import { NextResponse } from "next/server";
import { pollAllSamsaraConnections } from "@/src/lib/integrations/connectors/samsara/run-sync";
import { isAdminClientConfigError } from "@/src/lib/supabase/admin";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  const bearer = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pollAllSamsaraConnections();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (isAdminClientConfigError(error)) {
      console.error("[samsara-poll] admin client misconfigured");
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
