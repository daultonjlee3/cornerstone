"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTemplateWithLines } from "../actions";
import { Button } from "@/src/components/ui/button";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { ActionsDropdown } from "@/src/components/ui/actions-dropdown";
import { deletePurchaseOrder, savePurchaseOrder } from "../actions";
import {
  PurchaseOrderFormModal,
  type PurchaseOrderRecord,
  type ProductOption,
} from "./purchase-order-form-modal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/ui/tooltip";

type CompanyOption = { id: string; name: string };
type VendorOption = { id: string; name: string; company_id: string };

type VendorPricingEntry = { vendor_id: string; product_id: string; unit_cost: number; taxable_override: boolean | null };

export type InitialFromTemplate = {
  companyId: string;
  vendorId: string | null;
  lineRows: { productId: string; quantity: string; unitCost: string }[];
};

type PurchaseOrdersListProps = {
  rows: PurchaseOrderRecord[];
  companies: CompanyOption[];
  vendors: VendorOption[];
  products: ProductOption[];
  vendorPricing?: VendorPricingEntry[];
  useTemplateId?: string;
};

const PAGE_SIZE = 12;

export function PurchaseOrdersList({
  rows,
  companies,
  vendors,
  products,
  vendorPricing = [],
  useTemplateId,
}: PurchaseOrdersListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrderRecord | null>(null);
  const [initialFromTemplate, setInitialFromTemplate] = useState<InitialFromTemplate | null>(null);

  useEffect(() => {
    if (!useTemplateId) return;
    let cancelled = false;
    getTemplateWithLines(useTemplateId).then((result) => {
      if (cancelled) return;
      if (!result || "error" in result) return;
      const { template, lines } = result;
      setInitialFromTemplate({
        companyId: (template as { company_id: string }).company_id,
        vendorId: (template as { vendor_id?: string | null }).vendor_id ?? null,
        lineRows: (lines ?? []).map((l) => ({
          productId: (l as { product_id: string }).product_id,
          quantity: String((l as { default_quantity?: number }).default_quantity ?? 0),
          unitCost:
            (l as { default_unit_cost?: number | null }).default_unit_cost != null
              ? String((l as { default_unit_cost: number }).default_unit_cost)
              : "",
        })),
      });
      setEditing(null);
      setModalOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [useTemplateId]);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!lower) return true;
      return `${row.po_number ?? ""} ${row.vendor_name ?? ""} ${row.company_name ?? ""}`
        .toLowerCase()
        .includes(lower);
    });
  }, [query, rows, statusFilter]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => set.add(row.status));
    return [...set];
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (row: PurchaseOrderRecord) => {
    setEditing(row);
    setModalOpen(true);
  };

  const onDelete = (row: PurchaseOrderRecord) => {
    if (!confirm(`Delete purchase order "${row.po_number ?? row.id}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deletePurchaseOrder(row.id);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Purchase order deleted." });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4" data-tour="purchase-orders:ordering">
      {message ? (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-end gap-2">
          <label className="w-full max-w-sm">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Search</span>
            <input
              className="ui-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by PO number or vendor"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Status</span>
            <select
              className="ui-select"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <Tooltip placement="bottom">
            <TooltipTrigger>
              <Button onClick={openNew}>New Purchase Order</Button>
            </TooltipTrigger>
            <TooltipContent>Order and receive parts</TooltipContent>
          </Tooltip>
          <Button variant="secondary" asChild>
            <Link href="/purchase-orders/templates">Templates</Link>
          </Button>
        </div>
      </div>

      <div data-tour="purchase-orders:receiving">
      <DataTable>
        <Table className="min-w-[980px]">
          <TableHead>
            <Th>PO Number</Th>
            <Th>Company</Th>
            <Th>Vendor</Th>
            <Th>Status</Th>
            <Th className="text-right">Lines</Th>
            <Th>Order Date</Th>
            <Th>Expected Delivery</Th>
            <Th className="text-right">Total Cost</Th>
            <Th className="w-36">Actions</Th>
          </TableHead>
          <TBody>
            {pageRows.length === 0 ? (
              <Tr>
                <td className="px-4 py-3.5 text-center text-[var(--muted)]" colSpan={9}>
                  No purchase orders found.
                </td>
              </Tr>
            ) : null}
            {pageRows.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <Link href={`/purchase-orders/${row.id}`} className="font-medium text-[var(--accent)] hover:underline">
                    {row.po_number ?? row.id.slice(0, 8)}
                  </Link>
                </Td>
                <Td>{row.company_name ?? "—"}</Td>
                <Td>{row.vendor_name ?? "—"}</Td>
                <Td>
                  <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {row.status.replace(/_/g, " ")}
                  </span>
                </Td>
                <Td className="text-right text-[var(--muted)]">
                  {row.line_count != null ? `${row.line_count} line${row.line_count !== 1 ? "s" : ""}` : "—"}
                </Td>
                <Td>{row.order_date ?? "—"}</Td>
                <Td>{row.expected_delivery_date ?? "—"}</Td>
                <Td className="text-right">${Number(row.total_cost ?? 0).toFixed(2)}</Td>
                <Td>
                  <ActionsDropdown
                    align="right"
                    items={[
                      { type: "link", label: "View", href: `/purchase-orders/${row.id}` },
                      { type: "button", label: "Edit", onClick: () => openEdit(row) },
                      { type: "button", label: "Delete", onClick: () => onDelete(row), disabled: isPending, destructive: true },
                    ]}
                  />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </DataTable>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">
          Showing {(currentPage - 1) * PAGE_SIZE + (pageRows.length ? 1 : 0)}-
          {(currentPage - 1) * PAGE_SIZE + pageRows.length} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-[var(--muted)]">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <PurchaseOrderFormModal
        key={`${editing?.id ?? "new"}-${modalOpen ? "open" : "closed"}`}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setInitialFromTemplate(null);
          router.refresh();
        }}
        initialFromTemplate={initialFromTemplate}
        purchaseOrder={editing}
        companies={companies}
        vendors={vendors}
        products={products}
        vendorPricing={vendorPricing}
        saveAction={savePurchaseOrder}
      />
    </div>
  );
}
