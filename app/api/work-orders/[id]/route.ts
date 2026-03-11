import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { getTechnicianExecutionPayload } from "@/src/lib/work-orders/technician-execution-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = await getTechnicianExecutionPayload(id, {
      supabase: supabase as unknown as SupabaseClient,
      requireAssignedAccess: false,
    });
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load work order.";
    const normalized = message.toLowerCase();
    const status = normalized.includes("unauthorized")
      ? 403
      : normalized.includes("not found")
      ? 404
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
