import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import {
  addWorkOrderPartUsage,
  type AddPartUsagePayload,
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

  const body = (await request.json().catch(() => ({}))) as Partial<AddPartUsagePayload>;
  const quantity = Number(body.quantity_used ?? NaN);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "quantity_used must be greater than zero." }, { status: 400 });
  }

  const payload: AddPartUsagePayload = {
    inventory_item_id: body.inventory_item_id ?? null,
    part_name_snapshot: body.part_name_snapshot ?? null,
    sku_snapshot: body.sku_snapshot ?? null,
    unit_of_measure: body.unit_of_measure ?? null,
    quantity_used: quantity,
    unit_cost:
      body.unit_cost == null || Number.isNaN(Number(body.unit_cost))
        ? null
        : Number(body.unit_cost),
    notes: body.notes ?? null,
    deduct_inventory: Boolean(body.deduct_inventory),
  };
  const result = await addWorkOrderPartUsage(id, payload);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
