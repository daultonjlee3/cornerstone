"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";
import type { PurchaseOrderFormState } from "../actions";

export type PurchaseOrderRecord = {
  id: string;
  company_id: string;
  vendor_id: string;
  po_number: string | null;
  status: string;
  order_date: string | null;
  expected_delivery_date: string | null;
  notes: string | null;
  total_cost: number | null;
  created_at: string;
  updated_at: string;
  company_name?: string;
  vendor_name?: string;
  line_count?: number;
};

type CompanyOption = { id: string; name: string };
type VendorOption = { id: string; name: string; company_id: string };
export type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
  default_cost: number | null;
  company_id?: string;
  default_vendor_id?: string | null;
  taxable_default?: boolean;
};
export type VendorPricingEntry = { vendor_id: string; product_id: string; unit_cost: number; taxable_override: boolean | null };

type LineRow = { productId: string; quantity: string; unitCost: string };

type PurchaseOrderFormModalProps = {
  open: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrderRecord | null;
  companies: CompanyOption[];
  vendors: VendorOption[];
  products: ProductOption[];
  vendorPricing?: VendorPricingEntry[];
  initialFromTemplate?: { companyId: string; vendorId: string | null; lineRows: LineRow[] } | null;
  saveAction: (
    prev: PurchaseOrderFormState,
    formData: FormData
  ) => Promise<PurchaseOrderFormState>;
};

const STATUS_OPTIONS = ["draft", "ordered", "partially_received", "received", "cancelled"] as const;

const defaultLineRow = (): LineRow => ({ productId: "", quantity: "", unitCost: "" });

export function PurchaseOrderFormModal({
  open,
  onClose,
  purchaseOrder,
  companies,
  vendors,
  products,
  vendorPricing = [],
  initialFromTemplate,
  saveAction,
}: PurchaseOrderFormModalProps) {
  const [state, formAction, isPending] = useActionState(saveAction, {});
  const [companyId, setCompanyId] = useState(
    () => purchaseOrder?.company_id ?? (companies.length === 1 ? companies[0]?.id ?? "" : "")
  );
  const [vendorId, setVendorId] = useState(
    () => purchaseOrder?.vendor_id ?? ""
  );
  const [lineRows, setLineRows] = useState<LineRow[]>(() => [defaultLineRow()]);
  const [lineErrors, setLineErrors] = useState<Record<number, string>>({});

  const isCreate = !purchaseOrder;

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  useEffect(() => {
    if (open && isCreate) {
      if (initialFromTemplate?.lineRows?.length) {
        setCompanyId(initialFromTemplate.companyId);
        setVendorId(initialFromTemplate.vendorId ?? "");
        setLineRows(initialFromTemplate.lineRows);
      } else {
        setLineRows([defaultLineRow()]);
      }
      setLineErrors({});
    }
  }, [open, isCreate, initialFromTemplate]);

  useEffect(() => {
    if (purchaseOrder?.vendor_id) setVendorId(purchaseOrder.vendor_id);
  }, [purchaseOrder?.vendor_id]);

  const vendorsForCompany = useMemo(
    () => vendors.filter((vendor) => vendor.company_id === companyId),
    [vendors, companyId]
  );

  useEffect(() => {
    if (isCreate && companyId && vendorsForCompany.length > 0 && !vendorsForCompany.some((v) => v.id === vendorId)) {
      setVendorId(vendorsForCompany[0].id);
    }
  }, [isCreate, companyId, vendorsForCompany, vendorId]);

  const productsForCompany = useMemo(() => {
    const filtered =
      companyId
        ? products.filter((p) => (p.company_id ? p.company_id === companyId : true))
        : products;
    if (!vendorId) return filtered;
    return [...filtered].sort((a, b) => {
      const aMatch = a.default_vendor_id === vendorId ? 1 : 0;
      const bMatch = b.default_vendor_id === vendorId ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [products, companyId, vendorId]);

  const lineTotals = useMemo(() => {
    return lineRows.map((row) => {
      const qty = parseQuantity(row.quantity);
      const cost = parseUnitCost(row.unitCost, row.productId, products, vendorId);
      return { qty, cost, total: qty * cost };
    });
  }, [lineRows, products, vendorId, vendorPricing]);

  const subtotal = useMemo(
    () => lineTotals.reduce((sum, t) => sum + t.total, 0),
    [lineTotals]
  );

  function parseQuantity(s: string): number {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function parseUnitCost(
    s: string,
    productId: string,
    prods: ProductOption[],
    currentVendorId?: string
  ): number {
    if (s.trim() !== "") {
      const n = Number(s);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    if (currentVendorId) {
      const vp = vendorPricing.find((e) => e.vendor_id === currentVendorId && e.product_id === productId);
      if (vp != null && Number.isFinite(vp.unit_cost)) return vp.unit_cost;
    }
    const product = prods.find((p) => p.id === productId);
    return product?.default_cost != null && Number.isFinite(product.default_cost) ? product.default_cost : 0;
  }

  function validateLines(): boolean {
    const errs: Record<number, string> = {};
    let valid = true;
    const filled = lineRows.filter((r) => r.productId.trim() !== "" || r.quantity.trim() !== "" || r.unitCost.trim() !== "");
    if (filled.length === 0) {
      setLineErrors({ 0: "Add at least one line item with a product and quantity." });
      return false;
    }
    lineRows.forEach((row, idx) => {
      if (!row.productId.trim()) {
        errs[idx] = "Select a product.";
        valid = false;
      } else if (!row.quantity.trim()) {
        errs[idx] = "Quantity required.";
        valid = false;
      } else {
        const qty = parseQuantity(row.quantity);
        if (qty <= 0) {
          errs[idx] = "Quantity must be greater than zero.";
          valid = false;
        }
      }
      if (row.unitCost.trim() !== "") {
        const c = Number(row.unitCost);
        if (!Number.isFinite(c) || c < 0) {
          errs[idx] = errs[idx] || "Unit cost cannot be negative.";
          valid = false;
        }
      }
    });
    setLineErrors(errs);
    return valid;
  }

  const addLine = () => setLineRows((prev) => [...prev, defaultLineRow()]);
  const removeLine = (index: number) => {
    setLineRows((prev) => prev.filter((_, i) => i !== index));
    setLineErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const vp = vendorId
      ? vendorPricing.find((e) => e.vendor_id === vendorId && e.product_id === productId)
      : null;
    const preferredCost =
      vp != null && Number.isFinite(vp.unit_cost)
        ? vp.unit_cost
        : product?.default_cost != null
          ? product.default_cost
          : null;
    setLineRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productId,
        unitCost:
          next[index].unitCost.trim() === "" && preferredCost != null
            ? String(preferredCost)
            : next[index].unitCost,
      };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (isCreate) {
      if (!validateLines()) {
        e.preventDefault();
        return;
      }
      const form = e.currentTarget;
      const payload = lineRows
        .filter((r) => r.productId.trim() && parseQuantity(r.quantity) > 0)
        .map((row) => ({
          product_id: row.productId,
          quantity: parseQuantity(row.quantity),
          unit_price:
            row.unitCost.trim() !== ""
              ? (Number(row.unitCost) >= 0 ? Number(row.unitCost) : null)
              : null,
        }));
      const input = form.querySelector('input[name="line_items"]') as HTMLInputElement | null;
      if (input) input.value = JSON.stringify(payload);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={purchaseOrder ? "Edit Purchase Order" : "New Purchase Order"}
      className={isCreate ? "max-w-3xl" : "max-w-xl"}
    >
      <form action={formAction} className="space-y-4" onSubmit={handleSubmit}>
        {purchaseOrder ? <input type="hidden" name="id" value={purchaseOrder.id} /> : null}
        {isCreate ? <input type="hidden" name="line_items" value="" /> : null}
        {state?.error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company" htmlFor="po-company" required>
            <select
              id="po-company"
              name="company_id"
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="ui-select"
              required
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Vendor" htmlFor="po-vendor" required>
            <select
              id="po-vendor"
              name="vendor_id"
              value={vendorId || (vendorsForCompany[0]?.id ?? "")}
              onChange={(e) => setVendorId(e.target.value)}
              className="ui-select"
              required
            >
              {vendorsForCompany.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="PO Number" htmlFor="po-number">
            <input
              id="po-number"
              name="po_number"
              defaultValue={purchaseOrder?.po_number ?? ""}
              placeholder="Auto-generated if blank"
              className="ui-input"
            />
          </FormField>
          <FormField label="Status" htmlFor="po-status">
            <select id="po-status" name="status" defaultValue={purchaseOrder?.status ?? "draft"} className="ui-select">
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Order date" htmlFor="po-order-date">
            <input
              id="po-order-date"
              name="order_date"
              type="date"
              defaultValue={purchaseOrder?.order_date ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Expected delivery date" htmlFor="po-expected-delivery">
            <input
              id="po-expected-delivery"
              name="expected_delivery_date"
              type="date"
              defaultValue={purchaseOrder?.expected_delivery_date ?? ""}
              className="ui-input"
            />
          </FormField>
        </div>

        {isCreate ? (
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Line items</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Add products, quantities, and unit costs. Line total and PO total update as you edit.
              {vendorId ? " Products for the selected vendor are shown first." : ""}
            </p>
            <div className="mt-3 space-y-3 max-h-[280px] overflow-y-auto">
              {lineRows.map((row, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded border border-[var(--card-border)] bg-[var(--background)] p-3 sm:grid-cols-[1fr_100px_100px_90px_40px] sm:items-end"
                >
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Product</label>
                    <select
                      value={row.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="ui-select w-full"
                      required={idx === 0 && lineRows.length === 1}
                    >
                      <option value="">Select product</option>
                      {productsForCompany.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.sku ? ` (${p.sku})` : ""}
                          {vendorId && p.default_vendor_id === vendorId ? " • Vendor default" : ""}
                        </option>
                      ))}
                    </select>
                    {lineErrors[idx] ? (
                      <p className="mt-1 text-xs text-red-600">{lineErrors[idx]}</p>
                    ) : null}
                  </div>
                  <FormField label="Qty" htmlFor={`po-line-qty-${idx}`}>
                    <input
                      id={`po-line-qty-${idx}`}
                      type="number"
                      min="0"
                      step="0.0001"
                      value={row.quantity}
                      onChange={(e) =>
                        setLineRows((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], quantity: e.target.value };
                          return next;
                        })
                      }
                      className="ui-input"
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Unit cost" htmlFor={`po-line-cost-${idx}`}>
                    <input
                      id={`po-line-cost-${idx}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.unitCost}
                      onChange={(e) =>
                        setLineRows((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], unitCost: e.target.value };
                          return next;
                        })
                      }
                      className="ui-input"
                      placeholder="Auto"
                    />
                  </FormField>
                  <div>
                    <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Total</span>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      ${lineTotals[idx].total.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => removeLine(idx)}
                      disabled={lineRows.length <= 1}
                      className="shrink-0"
                      aria-label="Remove line"
                    >
                      —
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={addLine}>
                Add line
              </Button>
              <p className="text-sm text-[var(--foreground)]">
                Subtotal: <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </p>
            </div>
          </div>
        ) : null}

        <FormField label="Notes" htmlFor="po-notes">
          <textarea id="po-notes" name="notes" rows={3} defaultValue={purchaseOrder?.notes ?? ""} className="ui-input" />
        </FormField>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Saving…" : purchaseOrder ? "Save" : "Create"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
