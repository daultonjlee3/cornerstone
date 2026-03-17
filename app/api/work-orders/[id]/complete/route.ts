import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import {
  completeWorkOrder,
  type WorkOrderCompletionPayload,
} from "@/app/(authenticated)/work-orders/actions";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as WorkOrderCompletionPayload;
  if (!(body.resolution_summary ?? "").trim()) {
    return NextResponse.json({ error: "resolution_summary is required." }, { status: 400 });
  }

  const result = await completeWorkOrder(id, body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
