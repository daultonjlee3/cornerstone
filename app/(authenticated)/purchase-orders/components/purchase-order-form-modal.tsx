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
};

type CompanyOption = { id: string; name: string };
type VendorOption = { id: string; name: string; company_id: string };

type PurchaseOrderFormModalProps = {
  open: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrderRecord | null;
  companies: CompanyOption[];
  vendors: VendorOption[];
  saveAction: (
    prev: PurchaseOrderFormState,
    formData: FormData
  ) => Promise<PurchaseOrderFormState>;
};

const STATUS_OPTIONS = ["draft", "ordered", "partially_received", "received", "cancelled"] as const;

export function PurchaseOrderFormModal({
  open,
  onClose,
  purchaseOrder,
  companies,
  vendors,
  saveAction,
}: PurchaseOrderFormModalProps) {
  const [state, formAction, isPending] = useActionState(saveAction, {});
  const [companyId, setCompanyId] = useState(
    () => purchaseOrder?.company_id ?? (companies.length === 1 ? companies[0]?.id ?? "" : "")
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const vendorsForCompany = useMemo(
    () => vendors.filter((vendor) => vendor.company_id === companyId),
    [vendors, companyId]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={purchaseOrder ? "Edit Purchase Order" : "New Purchase Order"}
      className="max-w-xl"
    >
      <form action={formAction} className="space-y-4">
        {purchaseOrder ? <input type="hidden" name="id" value={purchaseOrder.id} /> : null}
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
              defaultValue={purchaseOrder?.vendor_id ?? vendorsForCompany[0]?.id ?? ""}
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
