"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";
import type { ProductFormState } from "../actions";

export type ProductRecord = {
  id: string;
  company_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit_of_measure: string | null;
  default_vendor_id: string | null;
  default_cost: number | null;
  reorder_point_default: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  company_name?: string;
  default_vendor_name?: string;
};

type CompanyOption = { id: string; name: string };
type VendorOption = { id: string; name: string; company_id: string };

type ProductFormModalProps = {
  open: boolean;
  onClose: () => void;
  product: ProductRecord | null;
  companies: CompanyOption[];
  vendors: VendorOption[];
  saveAction: (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;
};

const emptyProduct: ProductRecord = {
  id: "",
  company_id: "",
  name: "",
  sku: null,
  description: null,
  category: null,
  unit_of_measure: null,
  default_vendor_id: null,
  default_cost: null,
  reorder_point_default: null,
  active: true,
  created_at: "",
  updated_at: "",
};

export function ProductFormModal({
  open,
  onClose,
  product,
  companies,
  vendors,
  saveAction,
}: ProductFormModalProps) {
  const [state, formAction, isPending] = useActionState(saveAction, {});
  const isEdit = Boolean(product?.id);
  const row = product ?? { ...emptyProduct, company_id: companies[0]?.id ?? "" };
  const [companyId, setCompanyId] = useState(() => row.company_id);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const vendorOptions = useMemo(
    () => vendors.filter((vendor) => vendor.company_id === companyId),
    [vendors, companyId]
  );

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Product" : "New Product"} className="max-w-xl">
      <form action={formAction} className="space-y-4">
        {isEdit ? <input type="hidden" name="id" value={row.id} /> : null}
        {state?.error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company" htmlFor="product-company" required>
            <select
              id="product-company"
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
          <FormField label="SKU" htmlFor="product-sku">
            <input id="product-sku" name="sku" defaultValue={row.sku ?? ""} className="ui-input" />
          </FormField>
        </div>
        <FormField label="Product name" htmlFor="product-name" required>
          <input id="product-name" name="name" defaultValue={row.name} className="ui-input" required />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Category" htmlFor="product-category">
            <input id="product-category" name="category" defaultValue={row.category ?? ""} className="ui-input" />
          </FormField>
          <FormField label="Unit of measure" htmlFor="product-unit">
            <input
              id="product-unit"
              name="unit_of_measure"
              defaultValue={row.unit_of_measure ?? ""}
              placeholder="ea, ft, lb"
              className="ui-input"
            />
          </FormField>
        </div>
        <FormField label="Description" htmlFor="product-description">
          <textarea id="product-description" name="description" rows={3} defaultValue={row.description ?? ""} className="ui-input" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Default vendor" htmlFor="product-default-vendor">
            <select
              id="product-default-vendor"
              name="default_vendor_id"
              defaultValue={row.default_vendor_id ?? ""}
              className="ui-select"
            >
              <option value="">None</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Default cost" htmlFor="product-default-cost">
            <input
              id="product-default-cost"
              name="default_cost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={row.default_cost ?? ""}
              className="ui-input"
            />
          </FormField>
        </div>
        <FormField label="Default reorder point" htmlFor="product-reorder-point">
          <input
            id="product-reorder-point"
            name="reorder_point_default"
            type="number"
            min="0"
            step="0.0001"
            defaultValue={row.reorder_point_default ?? ""}
            className="ui-input"
          />
        </FormField>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={row.active} />
          <span className="text-sm text-[var(--foreground)]">Product is active</span>
        </label>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Saving…" : isEdit ? "Save" : "Create"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
