"use server";

import { revalidatePath } from "next/cache";
import { companyInScope, resolveProcurementScope } from "@/src/lib/procurement/scope";
import { insertActivityLog } from "@/src/lib/activity-logs";

export type PurchaseOrderFormState = { error?: string; success?: boolean };

function normalizeStatus(value: string): string {
  const allowed = ["draft", "ordered", "partially_received", "received", "cancelled"];
  return allowed.includes(value) ? value : "draft";
}

async function revalidatePurchaseOrderPaths(id?: string) {
  revalidatePath("/purchase-orders");
  revalidatePath("/inventory");
  revalidatePath("/work-orders");
  if (id) revalidatePath(`/purchase-orders/${id}`);
}

async function resolveActorUserId(
  supabase: Awaited<ReturnType<typeof resolveProcurementScope>>["supabase"],
  authUserId: string
): Promise<string | null> {
  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return (userRow as { id?: string | null } | null)?.id ?? null;
}

export async function savePurchaseOrder(
  _prev: PurchaseOrderFormState,
  formData: FormData
): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const id = ((formData.get("id") as string | null) ?? "").trim();
  const companyId = ((formData.get("company_id") as string | null) ?? "").trim();
  const vendorId = ((formData.get("vendor_id") as string | null) ?? "").trim();
  const poNumberRaw = ((formData.get("po_number") as string | null) ?? "").trim();
  const poNumber = poNumberRaw || `PO-${Date.now()}`;
  const status = normalizeStatus(((formData.get("status") as string | null) ?? "").trim());

  if (!companyInScope(companyId, scope.companyIds)) return { error: "Unauthorized." };
  if (!vendorId) return { error: "Vendor is required." };

  const { data: vendorRow } = await scope.supabase
    .from("vendors")
    .select("id, company_id")
    .eq("id", vendorId)
    .maybeSingle();
  if (!vendorRow) return { error: "Vendor not found." };
  if ((vendorRow as { company_id?: string | null }).company_id !== companyId) {
    return { error: "Vendor must belong to the selected company." };
  }

  const payload = {
    company_id: companyId,
    vendor_id: vendorId,
    po_number: poNumber,
    status,
    order_date: ((formData.get("order_date") as string | null) ?? "").trim() || null,
    expected_delivery_date:
      ((formData.get("expected_delivery_date") as string | null) ?? "").trim() || null,
    notes: ((formData.get("notes") as string | null) ?? "").trim() || null,
  };

  if (id) {
    const { data: existing } = await scope.supabase
      .from("purchase_orders")
      .select("id, company_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return { error: "Purchase order not found." };
    if (!companyInScope((existing as { company_id?: string | null }).company_id, scope.companyIds)) {
      return { error: "Unauthorized." };
    }

    const { error } = await scope.supabase.from("purchase_orders").update(payload).eq("id", id);
    if (error) return { error: error.message };
    const actorId = await resolveActorUserId(scope.supabase, scope.userId);
    if (actorId) {
      await insertActivityLog(scope.supabase, {
        tenantId: scope.tenantId,
        companyId,
        entityType: "purchase_order",
        entityId: id,
        actionType: "purchase_order_updated",
        performedBy: actorId,
        metadata: {
          status,
          vendor_id: vendorId,
          po_number: poNumber,
        },
      });
    }
    await revalidatePurchaseOrderPaths(id);
    return { success: true };
  }

  const { data: inserted, error } = await scope.supabase
    .from("purchase_orders")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { error: error.message };
  const actorId = await resolveActorUserId(scope.supabase, scope.userId);
  if (actorId && inserted?.id) {
    await insertActivityLog(scope.supabase, {
      tenantId: scope.tenantId,
      companyId,
      entityType: "purchase_order",
      entityId: (inserted as { id: string }).id,
      actionType: "purchase_order_created",
      performedBy: actorId,
      metadata: {
        status,
        vendor_id: vendorId,
        po_number: poNumber,
      },
    });
  }
  await revalidatePurchaseOrderPaths();
  return { success: true };
}

export async function deletePurchaseOrder(id: string): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: existing } = await scope.supabase
    .from("purchase_orders")
    .select("id, company_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Purchase order not found." };
  if (!companyInScope((existing as { company_id?: string | null }).company_id, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  const companyId = (existing as { company_id?: string | null }).company_id ?? null;
  const { error } = await scope.supabase.from("purchase_orders").delete().eq("id", id);
  if (error) return { error: error.message };
  const actorId = await resolveActorUserId(scope.supabase, scope.userId);
  if (actorId && companyId) {
    await insertActivityLog(scope.supabase, {
      tenantId: scope.tenantId,
      companyId,
      entityType: "purchase_order",
      entityId: id,
      actionType: "purchase_order_deleted",
      performedBy: actorId,
    });
  }
  await revalidatePurchaseOrderPaths();
  return { success: true };
}

async function refreshPurchaseOrderStatus(supabase: Awaited<ReturnType<typeof resolveProcurementScope>>["supabase"], purchaseOrderId: string) {
  const { data: lines } = await supabase
    .from("purchase_order_lines")
    .select("quantity, received_quantity")
    .eq("purchase_order_id", purchaseOrderId);
  const totalOrdered = (lines ?? []).reduce(
    (sum, row) => sum + Number((row as { quantity?: number }).quantity ?? 0),
    0
  );
  const totalReceived = (lines ?? []).reduce(
    (sum, row) => sum + Number((row as { received_quantity?: number }).received_quantity ?? 0),
    0
  );

  const status =
    totalOrdered <= 0
      ? "draft"
      : totalReceived <= 0
      ? "ordered"
      : totalReceived < totalOrdered
      ? "partially_received"
      : "received";

  await supabase.from("purchase_orders").update({ status }).eq("id", purchaseOrderId);
}

export async function savePurchaseOrderLine(
  purchaseOrderId: string,
  input: {
    id?: string;
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number | null;
  }
): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: po } = await scope.supabase
    .from("purchase_orders")
    .select("id, company_id")
    .eq("id", purchaseOrderId)
    .maybeSingle();
  if (!po) return { error: "Purchase order not found." };
  const companyId = (po as { company_id?: string | null }).company_id ?? null;
  if (!companyId || !companyInScope(companyId, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  if (!input.description.trim()) return { error: "Line description is required." };
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) return { error: "Quantity must be greater than zero." };
  if (input.unitPrice != null && (!Number.isFinite(input.unitPrice) || input.unitPrice < 0)) {
    return { error: "Unit price cannot be negative." };
  }

  const productId: string | null = input.productId ?? null;
  let resolvedUnitCostSnapshot = input.unitPrice;
  if (productId) {
    const { data: product } = await scope.supabase
      .from("products")
      .select("id, company_id, default_cost")
      .eq("id", productId)
      .maybeSingle();
    if (!product) return { error: "Selected product was not found." };
    if ((product as { company_id?: string | null }).company_id !== companyId) {
      return { error: "Selected product does not belong to this company." };
    }
    if (resolvedUnitCostSnapshot == null) {
      resolvedUnitCostSnapshot =
        (product as { default_cost?: number | null }).default_cost ?? null;
    }
  }

  const lineTotal = Number(input.quantity) * Number(resolvedUnitCostSnapshot ?? 0);
  const payload = {
    purchase_order_id: purchaseOrderId,
    product_id: productId,
    description: input.description.trim(),
    quantity: input.quantity,
    unit_price: resolvedUnitCostSnapshot,
    unit_cost_snapshot: resolvedUnitCostSnapshot,
    line_total: lineTotal,
  };

  if (input.id) {
    const { error } = await scope.supabase.from("purchase_order_lines").update(payload).eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await scope.supabase.from("purchase_order_lines").insert(payload);
    if (error) return { error: error.message };
  }

  const actorId = await resolveActorUserId(scope.supabase, scope.userId);
  if (actorId) {
    await insertActivityLog(scope.supabase, {
      tenantId: scope.tenantId,
      companyId,
      entityType: "purchase_order",
      entityId: purchaseOrderId,
      actionType: input.id ? "purchase_order_line_updated" : "purchase_order_line_added",
      performedBy: actorId,
      metadata: {
        product_id: productId,
        description: input.description.trim(),
        quantity: input.quantity,
        unit_cost_snapshot: resolvedUnitCostSnapshot,
      },
    });
  }

  await refreshPurchaseOrderStatus(scope.supabase, purchaseOrderId);
  await revalidatePurchaseOrderPaths(purchaseOrderId);
  return { success: true };
}

export async function deletePurchaseOrderLine(
  purchaseOrderId: string,
  lineId: string
): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: po } = await scope.supabase
    .from("purchase_orders")
    .select("id, company_id")
    .eq("id", purchaseOrderId)
    .maybeSingle();
  if (!po) return { error: "Purchase order not found." };
  if (!companyInScope((po as { company_id?: string | null }).company_id, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  const { error } = await scope.supabase
    .from("purchase_order_lines")
    .delete()
    .eq("id", lineId)
    .eq("purchase_order_id", purchaseOrderId);
  if (error) return { error: error.message };
  const companyId = (po as { company_id?: string | null }).company_id ?? null;
  const actorId = await resolveActorUserId(scope.supabase, scope.userId);
  if (actorId && companyId) {
    await insertActivityLog(scope.supabase, {
      tenantId: scope.tenantId,
      companyId,
      entityType: "purchase_order",
      entityId: purchaseOrderId,
      actionType: "purchase_order_line_deleted",
      performedBy: actorId,
      metadata: { line_id: lineId },
    });
  }

  await refreshPurchaseOrderStatus(scope.supabase, purchaseOrderId);
  await revalidatePurchaseOrderPaths(purchaseOrderId);
  return { success: true };
}

export async function receivePurchaseOrderLine(input: {
  purchaseOrderId: string;
  lineId: string;
  quantityReceived: number;
  stockLocationId: string;
}): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };
  if (!Number.isFinite(input.quantityReceived) || input.quantityReceived <= 0) {
    return { error: "Received quantity must be greater than zero." };
  }

  const { data: po } = await scope.supabase
    .from("purchase_orders")
    .select("id, company_id")
    .eq("id", input.purchaseOrderId)
    .maybeSingle();
  if (!po) return { error: "Purchase order not found." };
  const companyId = (po as { company_id?: string | null }).company_id ?? null;
  if (!companyId || !companyInScope(companyId, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  const { data: line } = await scope.supabase
    .from("purchase_order_lines")
    .select(
      "id, purchase_order_id, product_id, quantity, received_quantity, description, unit_cost_snapshot, unit_price"
    )
    .eq("id", input.lineId)
    .eq("purchase_order_id", input.purchaseOrderId)
    .maybeSingle();
  if (!line) return { error: "Purchase order line not found." };

  const productId = (line as { product_id?: string | null }).product_id ?? null;
  if (!productId) return { error: "Line must be linked to a product before receiving." };

  const ordered = Number((line as { quantity?: number }).quantity ?? 0);
  const alreadyReceived = Number((line as { received_quantity?: number }).received_quantity ?? 0);
  const remaining = Math.max(0, ordered - alreadyReceived);
  if (input.quantityReceived > remaining) {
    return { error: `Cannot receive more than remaining quantity (${remaining}).` };
  }
  const lineUnitCostSnapshot = Number(
    (line as { unit_cost_snapshot?: number | null }).unit_cost_snapshot ??
      (line as { unit_price?: number | null }).unit_price ??
      0
  );

  const idempotencyKey = `po-line-receive:${input.lineId}:${alreadyReceived + input.quantityReceived}`;
  const { error: txError } = await scope.supabase.rpc("record_inventory_transaction", {
    p_company_id: companyId,
    p_product_id: productId,
    p_stock_location_id: input.stockLocationId,
    p_quantity_change: input.quantityReceived,
    p_transaction_type: "receipt_from_po",
    p_reference_type: "purchase_order_line",
    p_reference_id: input.lineId,
    p_notes: `PO ${input.purchaseOrderId} line receipt`,
    p_idempotency_key: idempotencyKey,
    p_unit_cost_snapshot: lineUnitCostSnapshot,
  });
  if (txError) return { error: txError.message };

  const { error: lineUpdateError } = await scope.supabase
    .from("purchase_order_lines")
    .update({ received_quantity: alreadyReceived + input.quantityReceived })
    .eq("id", input.lineId);
  if (lineUpdateError) return { error: lineUpdateError.message };

  const actorId = await resolveActorUserId(scope.supabase, scope.userId);
  if (actorId) {
    await insertActivityLog(scope.supabase, {
      tenantId: scope.tenantId,
      companyId,
      entityType: "purchase_order",
      entityId: input.purchaseOrderId,
      actionType: "purchase_order_received",
      performedBy: actorId,
      metadata: {
        line_id: input.lineId,
        product_id: productId,
        stock_location_id: input.stockLocationId,
        quantity_received: input.quantityReceived,
        unit_cost_snapshot: lineUnitCostSnapshot,
        previous_received_quantity: alreadyReceived,
        new_received_quantity: alreadyReceived + input.quantityReceived,
      },
    });
  }

  await refreshPurchaseOrderStatus(scope.supabase, input.purchaseOrderId);
  await revalidatePurchaseOrderPaths(input.purchaseOrderId);
  return { success: true };
}

export async function receivePurchaseOrderAllRemaining(input: {
  purchaseOrderId: string;
  stockLocationId: string;
}): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: po } = await scope.supabase
    .from("purchase_orders")
    .select("id, company_id")
    .eq("id", input.purchaseOrderId)
    .maybeSingle();
  if (!po) return { error: "Purchase order not found." };
  const companyId = (po as { company_id?: string | null }).company_id ?? null;
  if (!companyId || !companyInScope(companyId, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  const { data: lines } = await scope.supabase
    .from("purchase_order_lines")
    .select("id, product_id, quantity, received_quantity, unit_cost_snapshot, unit_price")
    .eq("purchase_order_id", input.purchaseOrderId)
    .order("created_at", { ascending: true });
  if (!lines?.length) return { error: "Purchase order has no lines to receive." };

  const receivableLines = (lines ?? [])
    .map((line) => {
      const ordered = Number((line as { quantity?: number }).quantity ?? 0);
      const received = Number((line as { received_quantity?: number }).received_quantity ?? 0);
      return {
        id: (line as { id: string }).id,
        product_id: (line as { product_id?: string | null }).product_id ?? null,
        ordered,
        received,
        remaining: Math.max(0, ordered - received),
        unit_cost_snapshot:
          Number(
            (line as { unit_cost_snapshot?: number | null }).unit_cost_snapshot ??
              (line as { unit_price?: number | null }).unit_price ??
              0
          ) || 0,
      };
    })
    .filter((line) => line.product_id && line.remaining > 0);

  if (receivableLines.length === 0) {
    return { error: "No remaining receivable quantities found." };
  }

  for (const line of receivableLines) {
    const { error: txError } = await scope.supabase.rpc("record_inventory_transaction", {
      p_company_id: companyId,
      p_product_id: line.product_id,
      p_stock_location_id: input.stockLocationId,
      p_quantity_change: line.remaining,
      p_transaction_type: "receipt_from_po",
      p_reference_type: "purchase_order_line",
      p_reference_id: line.id,
      p_notes: `PO ${input.purchaseOrderId} full remaining receipt`,
      p_idempotency_key: `po-line-full-receive:${line.id}:${line.ordered}`,
      p_unit_cost_snapshot: line.unit_cost_snapshot,
    });
    if (txError) return { error: txError.message };

    const { error: lineUpdateError } = await scope.supabase
      .from("purchase_order_lines")
      .update({ received_quantity: line.ordered })
      .eq("id", line.id);
    if (lineUpdateError) return { error: lineUpdateError.message };
  }

  const actorId = await resolveActorUserId(scope.supabase, scope.userId);
  if (actorId) {
    await insertActivityLog(scope.supabase, {
      tenantId: scope.tenantId,
      companyId,
      entityType: "purchase_order",
      entityId: input.purchaseOrderId,
      actionType: "purchase_order_received",
      performedBy: actorId,
      metadata: {
        full_receipt: true,
        stock_location_id: input.stockLocationId,
        line_count: receivableLines.length,
        total_quantity_received: receivableLines.reduce((sum, line) => sum + line.remaining, 0),
      },
    });
  }

  await refreshPurchaseOrderStatus(scope.supabase, input.purchaseOrderId);
  await revalidatePurchaseOrderPaths(input.purchaseOrderId);
  return { success: true };
}
