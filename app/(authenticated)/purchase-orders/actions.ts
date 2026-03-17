"use server";

import { revalidatePath } from "next/cache";
import { companyInScope, resolveProcurementScope } from "@/src/lib/procurement/scope";
import { resolveTaxable } from "@/src/lib/procurement/pricing";
import { insertActivityLog } from "@/src/lib/activity-logs";

export type PurchaseOrderFormState = {
  error?: string;
  success?: boolean;
  /** Optional: used when template-related actions need to return a created/updated template id. */
  templateId?: string;
};

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

  // Parse line items for create flow
  type LineItemInput = {
    product_id: string;
    quantity: number;
    unit_price: number | null;
    taxable?: boolean;
  };
  let lineItems: LineItemInput[] = [];
  if (!id) {
    const raw = formData.get("line_items");
    if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          lineItems = parsed
            .map((item) => {
              const o = item as Record<string, unknown>;
              const productId = typeof o.product_id === "string" ? o.product_id.trim() : "";
              const qty = Number(o.quantity);
              const unitPrice =
                o.unit_price != null && o.unit_price !== ""
                  ? Number(o.unit_price)
                  : null;
              const taxable =
                typeof o.taxable === "boolean" ? o.taxable : o.taxable === "true" ? true : o.taxable === "false" ? false : undefined;
              return { product_id: productId, quantity: qty, unit_price: unitPrice, taxable };
            })
            .filter((item) => item.product_id && Number.isFinite(item.quantity) && item.quantity > 0);
        }
      } catch {
        lineItems = [];
      }
    }
    if (lineItems.length === 0) return { error: "Add at least one line item with a product and quantity." };
    for (const line of lineItems) {
      if (line.unit_price != null && (line.unit_price < 0 || !Number.isFinite(line.unit_price))) {
        return { error: "Unit cost cannot be negative." };
      }
    }
  }

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
  const newPoId = (inserted as { id: string } | null)?.id;
  if (!newPoId) return { error: "Failed to create purchase order." };

  for (const line of lineItems) {
    const { data: product } = await scope.supabase
      .from("products")
      .select("id, company_id, name, sku, default_cost, taxable_default")
      .eq("id", line.product_id)
      .maybeSingle();
    if (!product) return { error: "Selected product not found." };
    if ((product as { company_id?: string }).company_id !== companyId) {
      return { error: "Product must belong to the selected company." };
    }
    const p = product as {
      name: string;
      sku?: string | null;
      default_cost?: number | null;
      taxable_default?: boolean;
    };
    const productTaxableDefault = p.taxable_default !== false;

    const { data: vendorPricing } = await scope.supabase
      .from("vendor_pricing")
      .select("unit_cost, taxable_override")
      .eq("vendor_id", vendorId)
      .eq("product_id", line.product_id)
      .maybeSingle();
    const vp = vendorPricing as { unit_cost?: number | null; taxable_override?: boolean | null } | null;

    const unitPrice =
      line.unit_price != null && Number.isFinite(line.unit_price)
        ? line.unit_price
        : (vp?.unit_cost != null && Number.isFinite(vp.unit_cost)
            ? vp.unit_cost
            : (p.default_cost ?? null));
    const taxableSnapshot =
      typeof line.taxable === "boolean"
        ? line.taxable
        : resolveTaxable(productTaxableDefault, vp?.taxable_override ?? null);

    const description =
      p.sku && String(p.sku).trim() ? `${p.name} (${p.sku})` : p.name;
    const linePayload = {
      purchase_order_id: newPoId,
      product_id: line.product_id,
      description,
      quantity: line.quantity,
      unit_price: unitPrice,
      unit_cost_snapshot: unitPrice,
      taxable_snapshot: taxableSnapshot,
    };
    const { error: lineError } = await scope.supabase
      .from("purchase_order_lines")
      .insert(linePayload);
    if (lineError) return { error: lineError.message };
  }

  const actorId = await resolveActorUserId(scope.supabase, scope.userId);
  if (actorId) {
    await insertActivityLog(scope.supabase, {
      tenantId: scope.tenantId,
      companyId,
      entityType: "purchase_order",
      entityId: newPoId,
      actionType: "purchase_order_created",
      performedBy: actorId,
      metadata: {
        status,
        vendor_id: vendorId,
        po_number: poNumber,
        line_count: lineItems.length,
      },
    });
  }
  await revalidatePurchaseOrderPaths(newPoId);
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
    .select("id, company_id, vendor_id")
    .eq("id", purchaseOrderId)
    .maybeSingle();
  if (!po) return { error: "Purchase order not found." };
  const companyId = (po as { company_id?: string | null }).company_id ?? null;
  const vendorId = (po as { vendor_id?: string | null }).vendor_id ?? null;
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
  let taxableSnapshot: boolean | null = null;
  if (productId) {
    const { data: product } = await scope.supabase
      .from("products")
      .select("id, company_id, default_cost, taxable_default")
      .eq("id", productId)
      .maybeSingle();
    if (!product) return { error: "Selected product was not found." };
    if ((product as { company_id?: string | null }).company_id !== companyId) {
      return { error: "Selected product does not belong to this company." };
    }
    const p = product as { default_cost?: number | null; taxable_default?: boolean };
    const productTaxableDefault = p.taxable_default !== false;
    let vendorTaxOverride: boolean | null = null;
    if (vendorId) {
      const { data: vp } = await scope.supabase
        .from("vendor_pricing")
        .select("unit_cost, taxable_override")
        .eq("vendor_id", vendorId)
        .eq("product_id", productId)
        .maybeSingle();
      const v = vp as { unit_cost?: number | null; taxable_override?: boolean | null } | null;
      if (resolvedUnitCostSnapshot == null) {
        resolvedUnitCostSnapshot = v?.unit_cost != null ? v.unit_cost : (p.default_cost ?? null);
      }
      vendorTaxOverride = v?.taxable_override ?? null;
    } else {
      if (resolvedUnitCostSnapshot == null) {
        resolvedUnitCostSnapshot = p.default_cost ?? null;
      }
    }
    taxableSnapshot = resolveTaxable(productTaxableDefault, vendorTaxOverride);
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
    ...(taxableSnapshot !== null && { taxable_snapshot: taxableSnapshot }),
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
  receivedDate?: string;
  notes?: string;
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

  const actorId = await resolveActorUserId(scope.supabase, scope.userId);
  const receivedDate = input.receivedDate?.trim() || new Date().toISOString().slice(0, 10);

  const { data: receiptRow, error: receiptError } = await scope.supabase
    .from("purchase_receipts")
    .insert({
      purchase_order_id: input.purchaseOrderId,
      received_by_user_id: actorId ?? null,
      received_date: receivedDate,
      stock_location_id: input.stockLocationId,
      notes: (input.notes ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (receiptError) return { error: receiptError.message };
  const receiptId = (receiptRow as { id: string }).id;

  const { error: receiptLineError } = await scope.supabase.from("purchase_receipt_lines").insert({
    receipt_id: receiptId,
    purchase_order_line_id: input.lineId,
    product_id: productId,
    quantity_received: input.quantityReceived,
    unit_cost_snapshot: lineUnitCostSnapshot,
  });
  if (receiptLineError) return { error: receiptLineError.message };

  const idempotencyKey = `po-line-receive:${input.lineId}:${alreadyReceived + input.quantityReceived}`;
  const { error: txError } = await scope.supabase.rpc("record_inventory_transaction", {
    p_company_id: companyId,
    p_product_id: productId,
    p_stock_location_id: input.stockLocationId,
    p_quantity_change: input.quantityReceived,
    p_transaction_type: "receipt_from_po",
    p_reference_type: "purchase_order_line",
    p_reference_id: input.lineId,
    p_notes: input.notes?.trim() || `PO ${input.purchaseOrderId} line receipt`,
    p_idempotency_key: idempotencyKey,
    p_unit_cost_snapshot: lineUnitCostSnapshot,
  });
  if (txError) return { error: txError.message };

  const { error: lineUpdateError } = await scope.supabase
    .from("purchase_order_lines")
    .update({ received_quantity: alreadyReceived + input.quantityReceived })
    .eq("id", input.lineId);
  if (lineUpdateError) return { error: lineUpdateError.message };

  if (actorId) {
    await insertActivityLog(scope.supabase, {
      tenantId: scope.tenantId,
      companyId,
      entityType: "purchase_order",
      entityId: input.purchaseOrderId,
      actionType: "purchase_order_received",
      performedBy: actorId,
      metadata: {
        receipt_id: receiptId,
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
  receivedDate?: string;
  notes?: string;
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

  const actorId = await resolveActorUserId(scope.supabase, scope.userId);
  const receivedDate = input.receivedDate?.trim() || new Date().toISOString().slice(0, 10);

  const { data: receiptRow, error: receiptError } = await scope.supabase
    .from("purchase_receipts")
    .insert({
      purchase_order_id: input.purchaseOrderId,
      received_by_user_id: actorId ?? null,
      received_date: receivedDate,
      stock_location_id: input.stockLocationId,
      notes: (input.notes ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (receiptError) return { error: receiptError.message };
  const receiptId = (receiptRow as { id: string }).id;

  for (const line of receivableLines) {
    const { error: rlError } = await scope.supabase.from("purchase_receipt_lines").insert({
      receipt_id: receiptId,
      purchase_order_line_id: line.id,
      product_id: line.product_id,
      quantity_received: line.remaining,
      unit_cost_snapshot: line.unit_cost_snapshot,
    });
    if (rlError) return { error: rlError.message };
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
      p_notes: input.notes?.trim() || `PO ${input.purchaseOrderId} full remaining receipt`,
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

  if (actorId) {
    await insertActivityLog(scope.supabase, {
      tenantId: scope.tenantId,
      companyId,
      entityType: "purchase_order",
      entityId: input.purchaseOrderId,
      actionType: "purchase_order_received",
      performedBy: actorId,
      metadata: {
        receipt_id: receiptId,
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

// -----------------------------------------------------------------------------
// Purchase order templates
// -----------------------------------------------------------------------------

export type PurchaseOrderTemplateRecord = {
  id: string;
  company_id: string;
  vendor_id: string | null;
  name: string;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  vendor_name?: string | null;
};

export type PurchaseOrderTemplateLineRecord = {
  id: string;
  template_id: string;
  product_id: string;
  default_quantity: number;
  default_unit_cost: number | null;
  default_taxable: boolean | null;
  description_snapshot: string | null;
  sort_order: number;
  product_name?: string;
  product_sku?: string | null;
};

export async function getTemplateWithLines(
  templateId: string
): Promise<
  | { template: PurchaseOrderTemplateRecord; lines: PurchaseOrderTemplateLineRecord[] }
  | { error: string }
> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: templateRow } = await scope.supabase
    .from("purchase_order_templates")
    .select("id, company_id, vendor_id, name, notes, active, created_at, updated_at, vendors(name)")
    .eq("id", templateId)
    .maybeSingle();
  if (!templateRow) return { error: "Template not found." };
  const companyId = (templateRow as { company_id?: string }).company_id;
  if (!companyId || !companyInScope(companyId, scope.companyIds)) return { error: "Unauthorized." };

  const vendorObj = Array.isArray((templateRow as Record<string, unknown>).vendors)
    ? ((templateRow as Record<string, unknown>).vendors as unknown[])[0]
    : (templateRow as Record<string, unknown>).vendors;

  const template: PurchaseOrderTemplateRecord = {
    id: (templateRow as { id: string }).id,
    company_id: companyId,
    vendor_id: (templateRow as { vendor_id?: string | null }).vendor_id ?? null,
    name: (templateRow as { name: string }).name,
    notes: (templateRow as { notes?: string | null }).notes ?? null,
    active: (templateRow as { active?: boolean }).active !== false,
    created_at: (templateRow as { created_at?: string }).created_at ?? "",
    updated_at: (templateRow as { updated_at?: string }).updated_at ?? "",
    vendor_name:
      vendorObj && typeof vendorObj === "object" && "name" in (vendorObj as Record<string, unknown>)
        ? ((vendorObj as { name?: string }).name ?? null)
        : null,
  };

  const { data: lineRows } = await scope.supabase
    .from("purchase_order_template_lines")
    .select("id, template_id, product_id, default_quantity, default_unit_cost, default_taxable, description_snapshot, sort_order, products(name, sku)")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });

  const lines: PurchaseOrderTemplateLineRecord[] = (lineRows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const product = Array.isArray(r.products) ? (r.products as unknown[])[0] : r.products;
    const p = product as Record<string, unknown> | null;
    return {
      id: r.id as string,
      template_id: r.template_id as string,
      product_id: r.product_id as string,
      default_quantity: Number(r.default_quantity ?? 0),
      default_unit_cost: (r.default_unit_cost as number | null) ?? null,
      default_taxable: (r.default_taxable as boolean | null) ?? null,
      description_snapshot: (r.description_snapshot as string | null) ?? null,
      sort_order: Number(r.sort_order ?? 0),
      product_name: (p?.name as string) ?? undefined,
      product_sku: (p?.sku as string | null) ?? null,
    };
  });

  return { template, lines };
}

export async function savePurchaseOrderTemplate(
  _prev: PurchaseOrderFormState,
  formData: FormData
): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const id = (formData.get("id") as string | null)?.trim() ?? "";
  const companyId = (formData.get("company_id") as string | null)?.trim() ?? "";
  const vendorId = ((formData.get("vendor_id") as string | null) ?? "").trim() || null;

  if (!companyInScope(companyId, scope.companyIds)) return { error: "Unauthorized." };
  const name = ((formData.get("name") as string | null) ?? "").trim();
  if (!name) return { error: "Template name is required." };

  if (vendorId) {
    const { data: v } = await scope.supabase.from("vendors").select("id, company_id").eq("id", vendorId).maybeSingle();
    if (!v || (v as { company_id?: string }).company_id !== companyId) {
      return { error: "Vendor must belong to the selected company." };
    }
  }

  const payload = {
    company_id: companyId,
    vendor_id: vendorId,
    name,
    notes: ((formData.get("notes") as string | null) ?? "").trim() || null,
    active: (formData.get("active") as string | null) === "on",
  };

  if (id) {
    const { data: existing } = await scope.supabase
      .from("purchase_order_templates")
      .select("id, company_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing || !companyInScope((existing as { company_id?: string }).company_id, scope.companyIds)) {
      return { error: "Template not found." };
    }
    const { error } = await scope.supabase.from("purchase_order_templates").update(payload).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/purchase-orders");
    revalidatePath("/purchase-orders/templates");
    return { success: true, templateId: id };
  } else {
    const { data: inserted, error } = await scope.supabase
      .from("purchase_order_templates")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/purchase-orders");
    revalidatePath("/purchase-orders/templates");
    return { success: true, templateId: (inserted as { id: string }).id };
  }
}

export async function savePurchaseOrderTemplateLines(
  templateId: string,
  lines: { product_id: string; default_quantity: number; default_unit_cost?: number | null; default_taxable?: boolean | null; description_snapshot?: string | null }[]
): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: t } = await scope.supabase
    .from("purchase_order_templates")
    .select("id, company_id")
    .eq("id", templateId)
    .maybeSingle();
  if (!t || !companyInScope((t as { company_id?: string }).company_id, scope.companyIds)) {
    return { error: "Template not found." };
  }

  await scope.supabase.from("purchase_order_template_lines").delete().eq("template_id", templateId);

  let sortOrder = 0;
  for (const line of lines) {
    if (!line.product_id || !Number.isFinite(line.default_quantity) || line.default_quantity <= 0) continue;
    const { error } = await scope.supabase.from("purchase_order_template_lines").insert({
      template_id: templateId,
      product_id: line.product_id,
      default_quantity: line.default_quantity,
      default_unit_cost: line.default_unit_cost ?? null,
      default_taxable: line.default_taxable ?? null,
      description_snapshot: line.description_snapshot ?? null,
      sort_order: sortOrder++,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/purchase-orders");
  revalidatePath("/purchase-orders/templates");
  return { success: true };
}

export async function deletePurchaseOrderTemplate(templateId: string): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: t } = await scope.supabase
    .from("purchase_order_templates")
    .select("id, company_id")
    .eq("id", templateId)
    .maybeSingle();
  if (!t || !companyInScope((t as { company_id?: string }).company_id, scope.companyIds)) {
    return { error: "Template not found." };
  }

  const { error } = await scope.supabase.from("purchase_order_templates").delete().eq("id", templateId);
  if (error) return { error: error.message };

  revalidatePath("/purchase-orders");
  revalidatePath("/purchase-orders/templates");
  return { success: true };
}

export async function createTemplateFromPo(poId: string, templateName: string): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: po } = await scope.supabase
    .from("purchase_orders")
    .select("id, company_id, vendor_id")
    .eq("id", poId)
    .maybeSingle();
  if (!po || !companyInScope((po as { company_id?: string }).company_id, scope.companyIds)) {
    return { error: "Purchase order not found." };
  }
  const companyId = (po as { company_id: string }).company_id;
  const vendorId = (po as { vendor_id?: string | null }).vendor_id ?? null;

  const { data: lines } = await scope.supabase
    .from("purchase_order_lines")
    .select("product_id, quantity, unit_price, unit_cost_snapshot, taxable_snapshot, description")
    .eq("purchase_order_id", poId)
    .order("created_at", { ascending: true });

  const { data: inserted } = await scope.supabase
    .from("purchase_order_templates")
    .insert({
      company_id: companyId,
      vendor_id: vendorId,
      name: templateName.trim() || `From PO ${poId.slice(0, 8)}`,
      active: true,
    })
    .select("id")
    .single();
  if (!inserted) return { error: "Failed to create template." };
  const templateId = (inserted as { id: string }).id;

  let sortOrder = 0;
  for (const line of lines ?? []) {
    const l = line as { product_id?: string | null; quantity?: number; unit_price?: number | null; unit_cost_snapshot?: number | null; taxable_snapshot?: boolean | null; description?: string | null };
    if (!l.product_id) continue;
    await scope.supabase.from("purchase_order_template_lines").insert({
      template_id: templateId,
      product_id: l.product_id,
      default_quantity: l.quantity ?? 0,
      default_unit_cost: l.unit_cost_snapshot ?? l.unit_price ?? null,
      default_taxable: l.taxable_snapshot ?? null,
      description_snapshot: l.description ?? null,
      sort_order: sortOrder++,
    });
  }

  revalidatePath("/purchase-orders");
  revalidatePath("/purchase-orders/templates");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Vendor invoices (linked to PO, matching visibility)
// ---------------------------------------------------------------------------

export type VendorInvoiceHeader = {
  id: string;
  company_id: string;
  vendor_id: string;
  purchase_order_id: string | null;
  invoice_number: string;
  invoice_date: string;
  invoice_total: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vendor_name?: string;
};

export type VendorInvoiceLineRecord = {
  id: string;
  vendor_invoice_id: string;
  purchase_order_line_id: string | null;
  product_id: string | null;
  quantity_invoiced: number;
  unit_cost: number | null;
  line_total: number | null;
  created_at: string;
  updated_at: string;
  po_quantity?: number;
  po_received_quantity?: number;
  po_unit_cost?: number | null;
  quantity_mismatch?: boolean;
  price_mismatch?: boolean;
};

export async function getVendorInvoicesForPurchaseOrder(
  purchaseOrderId: string
): Promise<{ data: VendorInvoiceHeader[] | null; error: string | null }> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { data: null, error: "Unauthorized." };

  const { data: po } = await scope.supabase
    .from("purchase_orders")
    .select("id, company_id")
    .eq("id", purchaseOrderId)
    .maybeSingle();
  if (!po || !companyInScope((po as { company_id?: string }).company_id, scope.companyIds)) {
    return { data: null, error: "Purchase order not found." };
  }

  const { data: rows, error } = await scope.supabase
    .from("vendor_invoices")
    .select("id, company_id, vendor_id, purchase_order_id, invoice_number, invoice_date, invoice_total, status, notes, created_at, updated_at, vendors(name)")
    .eq("purchase_order_id", purchaseOrderId)
    .order("invoice_date", { ascending: false });
  if (error) return { data: null, error: error.message };

  const list = (rows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const vendor = Array.isArray(r.vendors) ? (r.vendors as unknown[])[0] : r.vendors;
    return {
      id: r.id as string,
      company_id: r.company_id as string,
      vendor_id: r.vendor_id as string,
      purchase_order_id: (r.purchase_order_id as string | null) ?? null,
      invoice_number: (r.invoice_number as string) ?? "",
      invoice_date: (r.invoice_date as string) ?? "",
      invoice_total: (r.invoice_total as number | null) ?? null,
      status: (r.status as string) ?? "draft",
      notes: (r.notes as string | null) ?? null,
      created_at: (r.created_at as string) ?? "",
      updated_at: (r.updated_at as string) ?? "",
      vendor_name:
        vendor && typeof vendor === "object" && "name" in (vendor as Record<string, unknown>)
          ? ((vendor as { name?: string }).name ?? undefined)
          : undefined,
    } as VendorInvoiceHeader;
  });
  return { data: list, error: null };
}

export async function getVendorInvoiceWithLines(
  invoiceId: string
): Promise<{
  data: {
    header: VendorInvoiceHeader;
    lines: VendorInvoiceLineRecord[];
  } | null;
  error: string | null;
}> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { data: null, error: "Unauthorized." };

  const { data: inv, error: invError } = await scope.supabase
    .from("vendor_invoices")
    .select("id, company_id, vendor_id, purchase_order_id, invoice_number, invoice_date, invoice_total, status, notes, created_at, updated_at, vendors(name)")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invError || !inv) return { data: null, error: invError?.message ?? "Invoice not found." };
  const invRow = inv as Record<string, unknown>;
  if (!companyInScope((invRow.company_id as string) ?? null, scope.companyIds)) {
    return { data: null, error: "Unauthorized." };
  }

  const { data: lineRows, error: lineError } = await scope.supabase
    .from("vendor_invoice_lines")
    .select("id, vendor_invoice_id, purchase_order_line_id, product_id, quantity_invoiced, unit_cost, line_total, created_at, updated_at")
    .eq("vendor_invoice_id", invoiceId)
    .order("created_at", { ascending: true });
  if (lineError) return { data: null, error: lineError.message };

  const poId = (invRow.purchase_order_id as string | null) ?? null;
  let poLines: { id: string; quantity: number; received_quantity: number; unit_cost_snapshot: number | null; unit_price: number | null }[] = [];
  if (poId) {
    const { data: pol } = await scope.supabase
      .from("purchase_order_lines")
      .select("id, quantity, received_quantity, unit_cost_snapshot, unit_price")
      .eq("purchase_order_id", poId);
    poLines = (pol ?? []).map((l) => ({
      id: (l as { id: string }).id,
      quantity: Number((l as { quantity?: number }).quantity ?? 0),
      received_quantity: Number((l as { received_quantity?: number }).received_quantity ?? 0),
      unit_cost_snapshot: (l as { unit_cost_snapshot?: number | null }).unit_cost_snapshot ?? null,
      unit_price: (l as { unit_price?: number | null }).unit_price ?? null,
    }));
  }
  const poLineById = new Map(poLines.map((l) => [l.id, l]));

  const header: VendorInvoiceHeader = {
    id: invRow.id as string,
    company_id: invRow.company_id as string,
    vendor_id: invRow.vendor_id as string,
    purchase_order_id: (invRow.purchase_order_id as string | null) ?? null,
    invoice_number: (invRow.invoice_number as string) ?? "",
    invoice_date: (invRow.invoice_date as string) ?? "",
    invoice_total: (invRow.invoice_total as number | null) ?? null,
    status: (invRow.status as string) ?? "draft",
    notes: (invRow.notes as string | null) ?? null,
    created_at: (invRow.created_at as string) ?? "",
    updated_at: (invRow.updated_at as string) ?? "",
    vendor_name:
      Array.isArray(invRow.vendors)
        ? (invRow.vendors as unknown[])[0] && typeof (invRow.vendors as unknown[])[0] === "object" && "name" in ((invRow.vendors as unknown[])[0] as Record<string, unknown>)
          ? (((invRow.vendors as unknown[])[0] as { name?: string }).name ?? undefined)
          : undefined
        : invRow.vendors && typeof invRow.vendors === "object" && "name" in (invRow.vendors as Record<string, unknown>)
          ? ((invRow.vendors as { name?: string }).name ?? undefined)
          : undefined,
  };

  const lines: VendorInvoiceLineRecord[] = (lineRows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const poLineId = (r.purchase_order_line_id as string | null) ?? null;
    const poLine = poLineId ? poLineById.get(poLineId) : null;
    const qtyInvoiced = Number(r.quantity_invoiced ?? 0);
    const unitCost = (r.unit_cost as number | null) ?? null;
    const poQty = poLine?.quantity ?? 0;
    const poReceived = poLine?.received_quantity ?? 0;
    const poCost = poLine?.unit_cost_snapshot ?? poLine?.unit_price ?? null;
    const quantityMismatch =
      poLine != null &&
      (qtyInvoiced > poQty || (poReceived > 0 && qtyInvoiced > poReceived));
    const priceMismatch =
      poLine != null &&
      poCost != null &&
      unitCost != null &&
      Math.abs(Number(unitCost) - Number(poCost)) > 0.005;
    return {
      id: r.id as string,
      vendor_invoice_id: r.vendor_invoice_id as string,
      purchase_order_line_id: poLineId,
      product_id: (r.product_id as string | null) ?? null,
      quantity_invoiced: qtyInvoiced,
      unit_cost: unitCost,
      line_total: (r.line_total as number | null) ?? null,
      created_at: (r.created_at as string) ?? "",
      updated_at: (r.updated_at as string) ?? "",
      po_quantity: poLine?.quantity,
      po_received_quantity: poLine?.received_quantity,
      po_unit_cost: poCost ?? undefined,
      quantity_mismatch: quantityMismatch,
      price_mismatch: priceMismatch,
    } as VendorInvoiceLineRecord;
  });

  return { data: { header, lines }, error: null };
}

export type SaveVendorInvoiceInput = {
  id?: string;
  company_id: string;
  vendor_id: string;
  purchase_order_id?: string | null;
  invoice_number: string;
  invoice_date: string;
  invoice_total?: number | null;
  status?: string;
  notes?: string | null;
  lines?: {
    id?: string;
    purchase_order_line_id?: string | null;
    product_id?: string | null;
    quantity_invoiced: number;
    unit_cost?: number | null;
    line_total?: number | null;
  }[];
};

export async function saveVendorInvoice(input: SaveVendorInvoiceInput): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };
  if (!companyInScope(input.company_id, scope.companyIds)) return { error: "Unauthorized." };
  if (!input.invoice_number?.trim()) return { error: "Invoice number is required." };
  const validStatuses = ["draft", "pending", "matched", "paid", "cancelled"];
  const status = input.status && validStatuses.includes(input.status) ? input.status : "draft";

  if (input.id) {
    const { data: existing } = await scope.supabase
      .from("vendor_invoices")
      .select("id, company_id")
      .eq("id", input.id)
      .maybeSingle();
    if (!existing || !companyInScope((existing as { company_id: string }).company_id, scope.companyIds)) {
      return { error: "Invoice not found." };
    }
    const { error: upErr } = await scope.supabase
      .from("vendor_invoices")
      .update({
        vendor_id: input.vendor_id,
        purchase_order_id: input.purchase_order_id ?? null,
        invoice_number: input.invoice_number.trim(),
        invoice_date: input.invoice_date,
        invoice_total: input.invoice_total ?? null,
        status,
        notes: (input.notes ?? "").trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);
    if (upErr) return { error: upErr.message };

    const existingLineIds = (
      await scope.supabase.from("vendor_invoice_lines").select("id").eq("vendor_invoice_id", input.id)
    ).data as { id: string }[] | null;
    const keptIds = new Set((input.lines ?? []).map((l) => l.id).filter(Boolean));
    for (const line of existingLineIds ?? []) {
      if (!keptIds.has(line.id)) {
        await scope.supabase.from("vendor_invoice_lines").delete().eq("id", line.id);
      }
    }
    for (const line of input.lines ?? []) {
      const qty = Number(line.quantity_invoiced);
      if (!Number.isFinite(qty) || qty < 0) continue;
      const lineTotal = line.line_total ?? (line.unit_cost != null ? qty * Number(line.unit_cost) : null);
      if (line.id && keptIds.has(line.id)) {
        await scope.supabase
          .from("vendor_invoice_lines")
          .update({
            purchase_order_line_id: line.purchase_order_line_id ?? null,
            product_id: line.product_id ?? null,
            quantity_invoiced: qty,
            unit_cost: line.unit_cost ?? null,
            line_total: lineTotal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", line.id);
      } else {
        await scope.supabase.from("vendor_invoice_lines").insert({
          vendor_invoice_id: input.id,
          purchase_order_line_id: line.purchase_order_line_id ?? null,
          product_id: line.product_id ?? null,
          quantity_invoiced: qty,
          unit_cost: line.unit_cost ?? null,
          line_total: lineTotal,
        });
      }
    }
  } else {
    const { data: inserted, error: insErr } = await scope.supabase
      .from("vendor_invoices")
      .insert({
        company_id: input.company_id,
        vendor_id: input.vendor_id,
        purchase_order_id: input.purchase_order_id ?? null,
        invoice_number: input.invoice_number.trim(),
        invoice_date: input.invoice_date,
        invoice_total: input.invoice_total ?? null,
        status,
        notes: (input.notes ?? "").trim() || null,
      })
      .select("id")
      .single();
    if (insErr) return { error: insErr.message };
    const newId = (inserted as { id: string }).id;
    for (const line of input.lines ?? []) {
      const qty = Number(line.quantity_invoiced);
      if (!Number.isFinite(qty) || qty < 0) continue;
      const lineTotal = line.line_total ?? (line.unit_cost != null ? qty * Number(line.unit_cost) : null);
      await scope.supabase.from("vendor_invoice_lines").insert({
        vendor_invoice_id: newId,
        purchase_order_line_id: line.purchase_order_line_id ?? null,
        product_id: line.product_id ?? null,
        quantity_invoiced: qty,
        unit_cost: line.unit_cost ?? null,
        line_total: lineTotal,
      });
    }
  }

  revalidatePath("/purchase-orders");
  if (input.purchase_order_id) revalidatePath(`/purchase-orders/${input.purchase_order_id}`);
  return { success: true };
}

export async function deleteVendorInvoice(invoiceId: string, purchaseOrderId?: string | null): Promise<PurchaseOrderFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: inv } = await scope.supabase
    .from("vendor_invoices")
    .select("id, company_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv || !companyInScope((inv as { company_id?: string }).company_id, scope.companyIds)) {
    return { error: "Invoice not found." };
  }

  const { error } = await scope.supabase.from("vendor_invoices").delete().eq("id", invoiceId);
  if (error) return { error: error.message };
  revalidatePath("/purchase-orders");
  if (purchaseOrderId) revalidatePath(`/purchase-orders/${purchaseOrderId}`);
  return { success: true };
}
