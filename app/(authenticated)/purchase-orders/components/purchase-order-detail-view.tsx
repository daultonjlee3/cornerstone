"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import {
  createTemplateFromPo,
  deletePurchaseOrderLine,
  deleteVendorInvoice,
  getVendorInvoiceWithLines,
  receivePurchaseOrderAllRemaining,
  receivePurchaseOrderLine,
  savePurchaseOrderLine,
  saveVendorInvoice,
} from "../actions";
import type { VendorInvoiceHeader } from "../actions";
import type { PurchaseOrderRecord } from "./purchase-order-form-modal";

type PurchaseOrderLineRecord = {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number | null;
  unit_cost_snapshot: number | null;
  line_total: number | null;
  received_quantity: number;
  taxable_snapshot: boolean | null;
};

type ProductOption = { id: string; name: string; sku: string | null };
type StockLocationOption = { id: string; name: string; location_type: string | null };

type PurchaseOrderDetailViewProps = {
  purchaseOrder: PurchaseOrderRecord;
  lines: PurchaseOrderLineRecord[];
  products: ProductOption[];
  stockLocations: StockLocationOption[];
  receivingHistory: {
    id: string;
    line_id: string;
    line_description: string;
    quantity_received: number;
    unit_cost_snapshot: number | null;
    stock_location_name: string;
    created_at: string;
    transaction_type: string | null;
    notes: string | null;
  }[];
  vendorInvoices: VendorInvoiceHeader[];
};

export function PurchaseOrderDetailView({
  purchaseOrder,
  lines,
  products,
  stockLocations,
  receivingHistory,
  vendorInvoices,
}: PurchaseOrderDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);
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
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptNotes, setReceiptNotes] = useState("");
  const [invoiceModal, setInvoiceModal] = useState<"closed" | "add" | { view: string }>("closed");
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    invoice_total: "",
    notes: "",
  });
  const [viewInvoiceData, setViewInvoiceData] = useState<{
    header: VendorInvoiceHeader;
    lines: { quantity_invoiced: number; unit_cost: number | null; line_total: number | null; quantity_mismatch?: boolean; price_mismatch?: boolean; po_quantity?: number; po_received_quantity?: number; po_unit_cost?: number | null }[];
  } | null>(null);

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
        receivedDate: receiptDate || undefined,
        notes: receiptNotes.trim() || undefined,
      });
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Inventory receipt recorded." });
      setReceiptQty("");
      setReceiptNotes("");
      router.refresh();
    });
  };

  const saveAsTemplate = () => {
    const name = window.prompt("Template name", `PO ${purchaseOrder.po_number ?? purchaseOrder.id.slice(0, 8)}`);
    if (name == null) return;
    setSavingAsTemplate(true);
    createTemplateFromPo(purchaseOrder.id, name).then((result) => {
      setSavingAsTemplate(false);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Template created. Use it from Purchase Orders → Templates." });
        router.refresh();
      }
    });
  };

  const submitFullReceipt = () => {
    if (!receiptLocation) {
      setMessage({ type: "error", text: "Select a stock location for receipt." });
      return;
    }
    startTransition(async () => {
      const result = await receivePurchaseOrderAllRemaining({
        purchaseOrderId: purchaseOrder.id,
        stockLocationId: receiptLocation,
        receivedDate: receiptDate || undefined,
        notes: receiptNotes.trim() || undefined,
      });
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "All remaining PO quantities were received." });
      setReceiptQty("");
      setReceiptLineId("");
      setReceiptNotes("");
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-4 lg:grid-cols-4 lg:flex-1">
        <SummaryCard title="Status" value={purchaseOrder.status.replace(/_/g, " ")} />
        <SummaryCard title="Line Count" value={String(lines.length)} />
        <SummaryCard title="Ordered Qty" value={totals.ordered.toFixed(2)} />
        <SummaryCard title="Received Qty" value={totals.received.toFixed(2)} />
        </div>
        <Button variant="secondary" size="sm" onClick={saveAsTemplate} disabled={savingAsTemplate || lines.length === 0}>
          {savingAsTemplate ? "Saving…" : "Save as template"}
        </Button>
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
                  <th className="px-2 py-2 text-right">Remaining</th>
                  <th className="px-2 py-2 text-right">Unit Cost Snapshot</th>
                  <th className="px-2 py-2">Taxable</th>
                  <th className="px-2 py-2 text-right">Line Total</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const product = line.product_id ? products.find((row) => row.id === line.product_id) : null;
                  const remaining = Math.max(
                    0,
                    Number(line.quantity ?? 0) - Number(line.received_quantity ?? 0)
                  );
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
                        {remaining}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {line.unit_cost_snapshot != null
                          ? `$${Number(line.unit_cost_snapshot).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {line.taxable_snapshot === true ? "Yes" : line.taxable_snapshot === false ? "No" : "—"}
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Receipt date</span>
            <input
              className="ui-input"
              type="date"
              value={receiptDate}
              onChange={(event) => setReceiptDate(event.target.value)}
            />
          </label>
          <label className="sm:col-span-2 lg:col-span-1">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Notes</span>
            <input
              className="ui-input"
              type="text"
              placeholder="Optional"
              value={receiptNotes}
              onChange={(event) => setReceiptNotes(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={submitReceipt} disabled={isPending || stockLocations.length === 0}>
            Post Receipt
          </Button>
          <Button
            variant="secondary"
            onClick={submitFullReceipt}
            disabled={isPending || stockLocations.length === 0}
          >
            Receive Full Remaining PO
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Receiving history</h2>
        {receivingHistory.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No receipts recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-2 py-2">Received At</th>
                  <th className="px-2 py-2">Line</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Unit Cost Snapshot</th>
                  <th className="px-2 py-2">Location</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {receivingHistory.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="px-2 py-2 text-[var(--foreground)]">
                      {new Date(receipt.created_at).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-[var(--foreground)]">{receipt.line_description}</td>
                    <td className="px-2 py-2 text-right text-[var(--foreground)]">
                      {receipt.quantity_received}
                    </td>
                    <td className="px-2 py-2 text-right text-[var(--foreground)]">
                      {receipt.unit_cost_snapshot != null
                        ? `$${Number(receipt.unit_cost_snapshot).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-[var(--foreground)]">{receipt.stock_location_name}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">
                      {receipt.transaction_type?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-[var(--muted)]">{receipt.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Invoices</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setInvoiceModal("add");
              setInvoiceForm({
                invoice_number: "",
                invoice_date: new Date().toISOString().slice(0, 10),
                invoice_total: "",
                notes: "",
              });
            }}
          >
            Add invoice
          </Button>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Vendor invoices linked to this PO. View to compare quantities and prices.
        </p>
        {vendorInvoices.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No invoices linked yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-2 py-2">Invoice #</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2 text-right">Total</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendorInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="px-2 py-2 text-[var(--foreground)]">{inv.invoice_number}</td>
                    <td className="px-2 py-2 text-[var(--foreground)]">{inv.invoice_date}</td>
                    <td className="px-2 py-2 text-right text-[var(--foreground)]">
                      {inv.invoice_total != null ? `$${Number(inv.invoice_total).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-2 py-2 text-[var(--muted)]">{inv.status}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          className="text-[var(--accent)] hover:underline"
                          onClick={() => {
                            setViewInvoiceData(null);
                            setInvoiceModal({ view: inv.id });
                            getVendorInvoiceWithLines(inv.id).then((res) => {
                              if (res.data) setViewInvoiceData({ header: res.data.header, lines: res.data.lines });
                            });
                          }}
                        >
                          View
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => {
                            if (!confirm(`Delete invoice ${inv.invoice_number}?`)) return;
                            startTransition(async () => {
                              const result = await deleteVendorInvoice(inv.id, purchaseOrder.id);
                              if (result.error) setMessage({ type: "error", text: result.error });
                              else {
                                setMessage({ type: "success", text: "Invoice deleted." });
                                setInvoiceModal("closed");
                                setViewInvoiceData(null);
                                router.refresh();
                              }
                            });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invoiceModal === "add" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-lg">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Add vendor invoice</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Link an invoice to this purchase order.</p>
            <div className="mt-4 space-y-3">
              <label>
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Invoice number *</span>
                <input
                  className="ui-input w-full"
                  value={invoiceForm.invoice_number}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, invoice_number: e.target.value }))}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Invoice date</span>
                <input
                  className="ui-input w-full"
                  type="date"
                  value={invoiceForm.invoice_date}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, invoice_date: e.target.value }))}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Invoice total</span>
                <input
                  className="ui-input w-full"
                  type="number"
                  step="0.01"
                  min="0"
                  value={invoiceForm.invoice_total}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, invoice_total: e.target.value }))}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Notes</span>
                <input
                  className="ui-input w-full"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setInvoiceModal("closed")}>
                Cancel
              </Button>
              <Button
                disabled={isPending || !invoiceForm.invoice_number.trim()}
                onClick={() => {
                  startTransition(async () => {
                    const result = await saveVendorInvoice({
                      company_id: purchaseOrder.company_id!,
                      vendor_id: purchaseOrder.vendor_id,
                      purchase_order_id: purchaseOrder.id,
                      invoice_number: invoiceForm.invoice_number.trim(),
                      invoice_date: invoiceForm.invoice_date,
                      invoice_total: invoiceForm.invoice_total ? Number(invoiceForm.invoice_total) : null,
                      notes: invoiceForm.notes.trim() || null,
                      lines: [],
                    });
                    if (result.error) setMessage({ type: "error", text: result.error });
                    else {
                      setMessage({ type: "success", text: "Invoice added." });
                      setInvoiceModal("closed");
                      router.refresh();
                    }
                  });
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {invoiceModal !== "closed" && typeof invoiceModal === "object" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-lg">
            {viewInvoiceData ? (
              <>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Invoice {viewInvoiceData.header.invoice_number}
            </h3>
            <p className="text-sm text-[var(--muted)]">
              {viewInvoiceData.header.invoice_date}
              {viewInvoiceData.header.invoice_total != null
                ? ` · $${Number(viewInvoiceData.header.invoice_total).toFixed(2)}`
                : ""}{" "}
              · {viewInvoiceData.header.status}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase text-[var(--muted)]">
                    <th className="px-2 py-2">Qty invoiced</th>
                    <th className="px-2 py-2 text-right">Unit cost</th>
                    <th className="px-2 py-2 text-right">Line total</th>
                    <th className="px-2 py-2">PO qty / received</th>
                    <th className="px-2 py-2">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoiceData.lines.map((line, i) => (
                    <tr key={i} className="border-b border-[var(--card-border)] last:border-0">
                      <td className="px-2 py-2">{line.quantity_invoiced}</td>
                      <td className="px-2 py-2 text-right">
                        {line.unit_cost != null ? `$${Number(line.unit_cost).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {line.line_total != null ? `$${Number(line.line_total).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-2 py-2 text-[var(--muted)]">
                        {line.po_quantity != null && line.po_received_quantity != null
                          ? `${line.po_quantity} / ${line.po_received_quantity}`
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {line.quantity_mismatch || line.price_mismatch ? (
                          <span className="text-amber-600">
                            {[line.quantity_mismatch && "Qty", line.price_mismatch && "Price"]
                              .filter(Boolean)
                              .join(", ")}{" "}
                            mismatch
                          </span>
                        ) : (
                          <span className="text-emerald-600">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => { setInvoiceModal("closed"); setViewInvoiceData(null); }}>
                Close
              </Button>
            </div>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">Loading invoice…</p>
            )}
          </div>
        </div>
      ) : null}
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
