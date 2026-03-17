"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { getEffectiveTaxableDisplay } from "@/src/lib/procurement/pricing";
import { saveVendorPricing, deleteVendorPricing, type VendorPricingFormState } from "../actions";

export type VendorPricingEntry = {
  id: string;
  vendor_id: string;
  product_id: string;
  vendor_item_name: string | null;
  vendor_sku: string | null;
  unit_cost: number;
  taxable_override: boolean | null;
  preferred: boolean;
  lead_time_days: number | null;
  notes: string | null;
  product_name?: string;
  product_sku?: string | null;
  product_taxable_default?: boolean;
};

type ProductOption = { id: string; name: string; sku: string | null; taxable_default: boolean };

type VendorPriceCatalogProps = {
  vendorId: string;
  vendorName: string;
  companyId: string;
  entries: VendorPricingEntry[];
  products: ProductOption[];
};

export function VendorPriceCatalog({
  vendorId,
  vendorName,
  companyId,
  entries,
  products,
}: VendorPriceCatalogProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VendorPricingEntry | null>(null);
  const [state, formAction, isPending] = useActionState(saveVendorPricing, {});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success) {
      setModalOpen(false);
      setEditing(null);
      router.refresh();
    }
  }, [state?.success, router]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (entry: VendorPricingEntry) => {
    setEditing(entry);
    setModalOpen(true);
  };

  const remove = async (pricingId: string) => {
    if (!confirm("Remove this pricing entry?")) return;
    setDeletingId(pricingId);
    const result = await deleteVendorPricing(vendorId, pricingId);
    setDeletingId(null);
    if (result.error) alert(result.error);
    else router.refresh();
  };

  const productOptions = products.filter(
    (p) => !entries.some((e) => e.product_id === p.id && e.id !== editing?.id)
  );
  const allProductsForSelect = editing ? products : productOptions;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Price catalog</CardTitle>
        <Button size="sm" onClick={openAdd} disabled={products.length === 0}>
          Add pricing
        </Button>
      </CardHeader>
      <CardContent>
        {state?.error ? (
          <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No vendor-specific pricing yet. Add entries to set unit cost and tax overrides per product.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2">Vendor SKU</th>
                  <th className="py-2 pr-2 text-right">Unit cost</th>
                  <th className="py-2 pr-2">Tax treatment</th>
                  <th className="py-2 pr-2">Preferred</th>
                  <th className="py-2 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="py-2 pr-2 text-[var(--foreground)]">
                      {entry.product_name ?? "—"}
                      {entry.product_sku ? ` (${entry.product_sku})` : ""}
                    </td>
                    <td className="py-2 pr-2 text-[var(--muted)]">{entry.vendor_sku ?? "—"}</td>
                    <td className="py-2 pr-2 text-right font-medium">${Number(entry.unit_cost).toFixed(2)}</td>
                    <td className="py-2 pr-2 text-[var(--muted)]">
                      {getEffectiveTaxableDisplay(
                        entry.taxable_override,
                        entry.product_taxable_default !== false
                      )}
                    </td>
                    <td className="py-2 pr-2">{entry.preferred ? "Yes" : "—"}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-[var(--accent)] hover:underline"
                          onClick={() => openEdit(entry)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:underline disabled:opacity-50"
                          onClick={() => remove(entry.id)}
                          disabled={deletingId === entry.id}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit vendor pricing" : "Add vendor pricing"}
        className="max-w-lg"
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="vendor_id" value={vendorId} />
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          {state?.error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
          <FormField label="Product" htmlFor="vp-product" required>
            <select
              id="vp-product"
              name="product_id"
              required
              defaultValue={editing?.product_id ?? ""}
              className="ui-select w-full"
              disabled={!!editing}
            >
              <option value="">Select product</option>
              {allProductsForSelect.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.sku ? ` (${p.sku})` : ""}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Vendor SKU / part number" htmlFor="vp-vendor-sku">
            <input
              id="vp-vendor-sku"
              name="vendor_sku"
              defaultValue={editing?.vendor_sku ?? ""}
              className="ui-input"
              placeholder="Vendor's part number"
            />
          </FormField>
          <FormField label="Vendor item name" htmlFor="vp-vendor-item-name">
            <input
              id="vp-vendor-item-name"
              name="vendor_item_name"
              defaultValue={editing?.vendor_item_name ?? ""}
              className="ui-input"
              placeholder="Vendor's description"
            />
          </FormField>
          <FormField label="Unit cost" htmlFor="vp-unit-cost" required>
            <input
              id="vp-unit-cost"
              name="unit_cost"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={editing?.unit_cost ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField
            label="Tax treatment"
            description="Override product default taxability for this vendor/product."
          >
            <select
              name="taxable_override"
              className="ui-select w-full"
              defaultValue={
                editing?.taxable_override === true
                  ? "true"
                  : editing?.taxable_override === false
                    ? "false"
                    : "use_default"
              }
            >
              <option value="use_default">Use product default</option>
              <option value="true">Taxable</option>
              <option value="false">Non-taxable</option>
            </select>
          </FormField>
          <FormField label="Lead time (days)" htmlFor="vp-lead-time">
            <input
              id="vp-lead-time"
              name="lead_time_days"
              type="number"
              min="0"
              step="1"
              defaultValue={editing?.lead_time_days ?? ""}
              className="ui-input"
            />
          </FormField>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="preferred" defaultChecked={editing?.preferred ?? false} />
            <span className="text-sm text-[var(--foreground)]">Preferred pricing for this product</span>
          </label>
          <FormField label="Notes" htmlFor="vp-notes">
            <textarea
              id="vp-notes"
              name="notes"
              rows={2}
              defaultValue={editing?.notes ?? ""}
              className="ui-input"
            />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : editing ? "Save" : "Add"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
