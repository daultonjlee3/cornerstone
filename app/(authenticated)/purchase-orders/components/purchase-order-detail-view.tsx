"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import {
  deletePurchaseOrderLine,
  receivePurchaseOrderLine,
  savePurchaseOrderLine,
} from "../actions";
import type { PurchaseOrderRecord } from "./purchase-order-form-modal";

type PurchaseOrderLineRecord = {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number | null;
  line_total: number | null;
  received_quantity: number;
};

type ProductOption = { id: string; name: string; sku: string | null };
type StockLocationOption = { id: string; name: string; location_type: string | null };

type PurchaseOrderDetailViewProps = {
  purchaseOrder: PurchaseOrderRecord;
  lines: PurchaseOrderLineRecord[];
  products: ProductOption[];
  stockLocations: StockLocationOption[];
};

export function PurchaseOrderDetailView({
  purchaseOrder,
  lines,
  products,
  stockLocations,
}: PurchaseOrderDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [draft, setDraft] = useState({
    id: "",
    productId: "",
    description: "",
    quantity: "",
    unitPrice: "",
  });
  const [receiptLineId, setReceiptLineId] = useState("");
  const [receiptQty, setReceiptQty] = useState("");
  const [receiptLocation, setReceiptLocation] = useState(stockLocations[0]?.id ?? "");

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, row) => sum + Number(row.line_total ?? 0), 0);
    const ordered = lines.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
    const received = lines.reduce((sum, row) => sum + Number(row.received_quantity ?? 0), 0);
    return { subtotal, ordered, received };
  }, [lines]);

  const resetDraft = () => {
    setDraft({ id: "", productId: "", description: "", quantity: "", unitPrice: "" });
  };

  const submitLine = () => {
    const quantity = Number(draft.quantity);
    const unitPrice = draft.unitPrice.trim() === "" ? null : Number(draft.unitPrice);
    if (!draft.description.trim()) {
      setMessage({ type: "error", text: "Line description is required." });
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessage({ type: "error", text: "Quantity must be greater than zero." });
      return;
    }
    if (unitPrice != null && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
      setMessage({ type: "error", text: "Unit price cannot be negative." });
      return;
    }

    startTransition(async () => {
      const result = await savePurchaseOrderLine(purchaseOrder.id, {
        id: draft.id || undefined,
        productId: draft.productId || null,
        description: draft.description,
        quantity,
        unitPrice,
      });
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: draft.id ? "Line updated." : "Line added." });
      resetDraft();
      router.refresh();
    });
  };

  const startEdit = (line: PurchaseOrderLineRecord) => {
    setDraft({
      id: line.id,
      productId: line.product_id ?? "",
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: line.unit_price != null ? String(line.unit_price) : "",
    });
  };

  const removeLine = (line: PurchaseOrderLineRecord) => {
    if (!confirm(`Delete line "${line.description}"?`)) return;
    startTransition(async () => {
      const result = await deletePurchaseOrderLine(purchaseOrder.id, line.id);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Line removed." });
      router.refresh();
    });
  };

  const submitReceipt = () => {
    if (!receiptLineId) {
      setMessage({ type: "error", text: "Select a line to receive." });
      return;
    }
    if (!receiptLocation) {
      setMessage({ type: "error", text: "Select a stock location for receipt." });
      return;
    }
    const quantityReceived = Number(receiptQty);
    if (!Number.isFinite(quantityReceived) || quantityReceived <= 0) {
      setMessage({ type: "error", text: "Received quantity must be greater than zero." });
      return;
    }

    startTransition(async () => {
      const result = await receivePurchaseOrderLine({
        purchaseOrderId: purchaseOrder.id,
        lineId: receiptLineId,
        quantityReceived,
        stockLocationId: receiptLocation,
      });
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Inventory receipt recorded." });
      setReceiptQty("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {message ? (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard title="Status" value={purchaseOrder.status.replace(/_/g, " ")} />
        <SummaryCard title="Line Count" value={String(lines.length)} />
        <SummaryCard title="Ordered Qty" value={totals.ordered.toFixed(2)} />
        <SummaryCard title="Received Qty" value={totals.received.toFixed(2)} />
      </div>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Line item editor</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Add line items and keep totals synchronized automatically.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Product</span>
            <select
              value={draft.productId}
              onChange={(event) => {
                const nextProductId = event.target.value;
                const selected = products.find((row) => row.id === nextProductId);
                setDraft((current) => ({
                  ...current,
                  productId: nextProductId,
                  description:
                    current.id || current.description.trim().length > 0
                      ? current.description
                      : selected
                      ? `${selected.name}${selected.sku ? ` (${selected.sku})` : ""}`
                      : "",
                }));
              }}
              className="ui-select"
            >
              <option value="">Manual / no linked product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.sku ? ` (${product.sku})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-3">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Description</span>
            <input
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className="ui-input"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Quantity</span>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={draft.quantity}
              onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))}
              className="ui-input"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Unit price</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.unitPrice}
              onChange={(event) => setDraft((current) => ({ ...current, unitPrice: event.target.value }))}
              className="ui-input"
            />
          </label>
          <div className="sm:col-span-3 flex items-end gap-2">
            <Button onClick={submitLine} disabled={isPending}>
              {draft.id ? "Update line" : "Add line"}
            </Button>
            {draft.id ? (
              <Button variant="secondary" onClick={resetDraft}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Purchase order lines</h2>
        {lines.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No lines yet. Add at least one line item.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Product</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Received</th>
                  <th className="px-2 py-2 text-right">Unit Price</th>
                  <th className="px-2 py-2 text-right">Line Total</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const product = line.product_id ? products.find((row) => row.id === line.product_id) : null;
                  return (
                    <tr key={line.id} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="px-2 py-2 text-[var(--foreground)]">{line.description}</td>
                      <td className="px-2 py-2 text-[var(--muted)]">
                        {product ? (
                          <Link href={`/products/${product.id}`} className="text-[var(--accent)] hover:underline">
                            {product.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">{line.quantity}</td>
                      <td className="px-2 py-2 text-right">{line.received_quantity}</td>
                      <td className="px-2 py-2 text-right">
                        {line.unit_price != null ? `$${Number(line.unit_price).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        ${Number(line.line_total ?? 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          <button className="text-[var(--accent)] hover:underline" onClick={() => startEdit(line)}>
                            Edit
                          </button>
                          <button className="text-red-600 hover:underline" onClick={() => removeLine(line)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 text-right text-sm text-[var(--foreground)]">
          Total: <span className="font-semibold">${totals.subtotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Receive inventory</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Receive against a line item and post stock into a selected location.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">PO line</span>
            <select
              className="ui-select"
              value={receiptLineId}
              onChange={(event) => setReceiptLineId(event.target.value)}
            >
              <option value="">Select line</option>
              {lines.map((line) => {
                const remaining = Math.max(0, Number(line.quantity ?? 0) - Number(line.received_quantity ?? 0));
                return (
                  <option key={line.id} value={line.id}>
                    {line.description} (remaining {remaining})
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Quantity received</span>
            <input
              className="ui-input"
              type="number"
              min="0"
              step="0.0001"
              value={receiptQty}
              onChange={(event) => setReceiptQty(event.target.value)}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Stock location</span>
            <select
              className="ui-select"
              value={receiptLocation}
              onChange={(event) => setReceiptLocation(event.target.value)}
            >
              {stockLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                  {location.location_type ? ` (${location.location_type.replace(/_/g, " ")})` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button onClick={submitReceipt} disabled={isPending || stockLocations.length === 0}>
              Post Receipt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
      <p className="text-xs text-[var(--muted)]">{title}</p>
      <p className="text-lg font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
