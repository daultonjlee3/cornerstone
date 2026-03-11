"use server";

import { revalidatePath } from "next/cache";
import { companyInScope, resolveProcurementScope } from "@/src/lib/procurement/scope";

export type PurchaseOrderFormState = { error?: string; success?: boolean };

function normalizeStatus(value: string): string {
  const allowed = ["draft", "ordered", "partially_received", "received", "cancelled"];
  return allowed.includes(value) ? value : "draft";
}

async function revalidatePurchaseOrderPaths(id?: string) {
  revalidatePath("/purchase-orders");
  revalidatePath("/inventory");
  if (id) revalidatePath(`/purchase-orders/${id}`);
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
    await revalidatePurchaseOrderPaths(id);
    return { success: true };
  }

  const { error } = await scope.supabase.from("purchase_orders").insert(payload);
  if (error) return { error: error.message };
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

  const { error } = await scope.supabase.from("purchase_orders").delete().eq("id", id);
  if (error) return { error: error.message };
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
  if (productId) {
    const { data: product } = await scope.supabase
      .from("products")
      .select("id, company_id")
      .eq("id", productId)
      .maybeSingle();
    if (!product) return { error: "Selected product was not found." };
    if ((product as { company_id?: string | null }).company_id !== companyId) {
      return { error: "Selected product does not belong to this company." };
    }
  }

  const lineTotal = Number(input.quantity) * Number(input.unitPrice ?? 0);
  const payload = {
    purchase_order_id: purchaseOrderId,
    product_id: productId,
    description: input.description.trim(),
    quantity: input.quantity,
    unit_price: input.unitPrice,
    line_total: lineTotal,
  };

  if (input.id) {
    const { error } = await scope.supabase.from("purchase_order_lines").update(payload).eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await scope.supabase.from("purchase_order_lines").insert(payload);
    if (error) return { error: error.message };
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
    .select("id, purchase_order_id, product_id, quantity, received_quantity, description")
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

  const idempotencyKey = `po-line-receive:${input.lineId}:${alreadyReceived + input.quantityReceived}`;
  const { error: txError } = await scope.supabase.rpc("record_inventory_transaction", {
    p_company_id: companyId,
    p_product_id: productId,
    p_stock_location_id: input.stockLocationId,
    p_quantity_change: input.quantityReceived,
    p_transaction_type: "purchase_received",
    p_reference_type: "purchase_order_line",
    p_reference_id: input.lineId,
    p_notes: `PO ${input.purchaseOrderId} line receipt`,
    p_idempotency_key: idempotencyKey,
  });
  if (txError) return { error: txError.message };

  const { error: lineUpdateError } = await scope.supabase
    .from("purchase_order_lines")
    .update({ received_quantity: alreadyReceived + input.quantityReceived })
    .eq("id", input.lineId);
  if (lineUpdateError) return { error: lineUpdateError.message };

  await refreshPurchaseOrderStatus(scope.supabase, input.purchaseOrderId);
  await revalidatePurchaseOrderPaths(input.purchaseOrderId);
  return { success: true };
}
