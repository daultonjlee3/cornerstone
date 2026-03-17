"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { FormField } from "@/src/components/ui/form-field";
import { savePurchaseOrderTemplate, savePurchaseOrderTemplateLines } from "../actions";

type CompanyOption = { id: string; name: string };
type VendorOption = { id: string; name: string; company_id: string };
type ProductOption = { id: string; name: string; sku: string | null; company_id?: string };

type LineRow = { productId: string; quantity: string };

type NewPurchaseOrderTemplateFormProps = {
  companies: CompanyOption[];
  vendors: VendorOption[];
  products: ProductOption[];
};

export function NewPurchaseOrderTemplateForm({
  companies,
  vendors,
  products,
}: NewPurchaseOrderTemplateFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState(companies.length === 1 ? companies[0]?.id ?? "" : "");
  const [lineRows, setLineRows] = useState<LineRow[]>([{ productId: "", quantity: "" }]);

  const vendorsForCompany = vendors.filter((v) => v.company_id === companyId);
  const productsForCompany = companyId
    ? products.filter((p) => (p.company_id ? p.company_id === companyId : true))
    : products;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    setIsPending(true);
    const result = await savePurchaseOrderTemplate({}, formData);
    if (result.error) {
      setError(result.error);
      setIsPending(false);
      return;
    }
    const templateId = "templateId" in result ? (result as { templateId?: string }).templateId : null;
    if (!templateId) {
      setIsPending(false);
      router.push("/purchase-orders/templates");
      return;
    }
    const lines = lineRows
      .filter((r) => r.productId && Number(r.quantity) > 0)
      .map((r) => ({ product_id: r.productId, default_quantity: Number(r.quantity) }));
    const lineResult = await savePurchaseOrderTemplateLines(templateId, lines);
    setIsPending(false);
    if (lineResult.error) setError(lineResult.error);
    else router.push("/purchase-orders/templates");
  };

  const addLine = () => setLineRows((prev) => [...prev, { productId: "", quantity: "" }]);
  const removeLine = (index: number) => setLineRows((prev) => prev.filter((_, i) => i !== index));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Template details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Template name" htmlFor="tpl-name" required>
            <input id="tpl-name" name="name" className="ui-input" required placeholder="e.g. Monthly supplies" />
          </FormField>
          <FormField label="Company" htmlFor="tpl-company" required>
            <select
              id="tpl-company"
              name="company_id"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="ui-select"
              required
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Default vendor" htmlFor="tpl-vendor">
            <select id="tpl-vendor" name="vendor_id" className="ui-select">
              <option value="">None</option>
              {vendorsForCompany.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="Notes" htmlFor="tpl-notes" className="mt-4">
          <textarea id="tpl-notes" name="notes" rows={2} className="ui-input" />
        </FormField>
        <input type="hidden" name="active" value="on" />
      </div>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Template lines</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Add products and default quantities. You can leave this empty and add lines when using the template.
        </p>
        <div className="mt-4 space-y-3">
          {lineRows.map((row, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-2">
              <select
                value={row.productId}
                onChange={(e) =>
                  setLineRows((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], productId: e.target.value };
                    return next;
                  })
                }
                className="ui-select min-w-[200px]"
              >
                <option value="">Select product</option>
                {productsForCompany.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.sku ? ` (${p.sku})` : ""}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.0001"
                placeholder="Qty"
                value={row.quantity}
                onChange={(e) =>
                  setLineRows((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], quantity: e.target.value };
                    return next;
                  })
                }
                className="ui-input w-24"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => removeLine(idx)} disabled={lineRows.length <= 1}>
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addLine}>
          Add line
        </Button>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create template"}
        </Button>
        <Button type="button" variant="secondary" asChild>
          <Link href="/purchase-orders/templates">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
