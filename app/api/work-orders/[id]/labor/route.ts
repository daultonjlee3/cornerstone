import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import {
  logWorkOrderLabor,
  type WorkOrderLaborLogPayload,
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

  const body = (await request.json().catch(() => ({}))) as Partial<WorkOrderLaborLogPayload>;
  const payload: WorkOrderLaborLogPayload = {
    start_time: String(body.start_time ?? ""),
    end_time: String(body.end_time ?? ""),
    labor_hours:
      body.labor_hours == null || Number.isNaN(Number(body.labor_hours))
        ? null
        : Number(body.labor_hours),
    notes: body.notes ?? null,
    technician_id: body.technician_id ?? null,
  };

  const result = await logWorkOrderLabor(id, payload);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
