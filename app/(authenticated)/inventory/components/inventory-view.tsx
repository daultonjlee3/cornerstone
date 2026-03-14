"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import {
  DataTable,
  Table,
  TableHead,
  Th,
  TBody,
  Tr,
  Td,
  TableToolbar,
  TableEmptyState,
  TablePagination,
} from "@/src/components/ui/data-table";
import { MetricCard } from "@/src/components/ui/metric-card";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { recordInventoryAdjustment, saveStockLocation } from "../actions";
import {
  StockLocationFormModal,
  type StockLocationRecord,
} from "./stock-location-form-modal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/ui/tooltip";
import { Hint } from "@/src/components/ui/hint";
import { HelperTip } from "@/src/components/ui/helper-tip";
import Link from "next/link";

type InventoryBalanceRow = {
  id: string;
  product_id: string;
  stock_location_id: string;
  quantity_on_hand: number;
  minimum_stock: number | null;
  reorder_point: number | null;
  updated_at: string;
  product_name: string;
  product_sku: string | null;
  product_category: string | null;
  location_name: string;
  location_type: string | null;
  company_name: string;
};

type CompanyOption = { id: string; name: string };
type PropertyOption = { id: string; name: string; company_id: string };
type BuildingOption = { id: string; name: string; property_id: string };
type UnitOption = { id: string; name: string; building_id: string };

type InventoryViewProps = {
  rows: InventoryBalanceRow[];
  transactions: {
    id: string;
    transaction_type: string | null;
    product_id: string | null;
    product_name: string;
    product_sku: string | null;
    stock_location_name: string;
    quantity_change: number;
    unit_cost_snapshot: number | null;
    reference_type: string | null;
    reference_id: string | null;
    reference_po_id: string | null;
    reference_work_order_id: string | null;
    created_at: string;
    notes: string | null;
  }[];
  locations: StockLocationRecord[];
  companies: CompanyOption[];
  properties: PropertyOption[];
  buildings: BuildingOption[];
  units: UnitOption[];
};

const PAGE_SIZE = 20;

export function InventoryView({
  rows,
  transactions,
  locations,
  companies,
  properties,
  buildings,
  units,
}: InventoryViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [locationId, setLocationId] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sort, setSort] = useState<"product" | "location" | "quantity">("product");
  const [page, setPage] = useState(1);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StockLocationRecord | null>(null);
  const [adjustment, setAdjustment] = useState<{
    productId: string;
    stockLocationId: string;
    productName: string;
    locationName: string;
  } | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (locationId !== "all" && row.stock_location_id !== locationId) return false;
      const reorder = Number(row.reorder_point ?? 0);
      const lowStock = reorder > 0 && Number(row.quantity_on_hand) < reorder;
      if (lowStockOnly && !lowStock) return false;
      if (!lower) return true;
      return `${row.product_name} ${row.product_sku ?? ""} ${row.location_name} ${row.company_name}`
        .toLowerCase()
        .includes(lower);
    });

    list.sort((a, b) => {
      if (sort === "quantity") return Number(a.quantity_on_hand) - Number(b.quantity_on_hand);
      if (sort === "location") return a.location_name.localeCompare(b.location_name) || a.product_name.localeCompare(b.product_name);
      return a.product_name.localeCompare(b.product_name);
    });
    return list;
  }, [locationId, lowStockOnly, query, rows, sort]);

  const lowStockCount = filtered.filter((row) => {
    const reorder = Number(row.reorder_point ?? 0);
    return reorder > 0 && Number(row.quantity_on_hand) < reorder;
  }).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openLocationCreate = () => {
    setEditingLocation(null);
    setLocationModalOpen(true);
  };
  const openLocationEdit = (location: StockLocationRecord) => {
    setEditingLocation(location);
    setLocationModalOpen(true);
  };

  const runAdjustment = () => {
    if (!adjustment) return;
    const delta = Number(adjustQuantity);
    if (!Number.isFinite(delta) || delta === 0) {
      setMessage({ type: "error", text: "Adjustment quantity must be a non-zero number." });
      return;
    }
    startTransition(async () => {
      const result = await recordInventoryAdjustment({
        productId: adjustment.productId,
        stockLocationId: adjustment.stockLocationId,
        quantityChange: delta,
        notes: adjustNotes.trim() || undefined,
      });
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Inventory adjustment recorded." });
      setAdjustment(null);
      setAdjustQuantity("");
      setAdjustNotes("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}
      {locations.length === 0 && rows.length === 0 && (
        <Hint
          id="inventory-no-locations"
          variant="card"
          title="Location-based inventory"
          message="Track stock by place—warehouses, trucks, lockers. Create stock locations first, then add products and record balances."
          action={
            <button
              type="button"
              onClick={openLocationCreate}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              New Stock Location
            </button>
          }
        />
      )}
      {lowStockCount > 0 && (
        <HelperTip
          id="helper-tip-inventory-low-stock"
          message="Low stock may impact upcoming work."
          action={
            <Link href="/purchase-orders" className="text-[var(--accent)] hover:underline">
              Purchase Orders →
            </Link>
          }
        />
      )}
      <div className="grid gap-3 sm:grid-cols-3" data-tour="inventory:products">
        <MetricCard title="Inventory rows" value={rows.length} />
        <MetricCard
          title="Low stock alerts"
          value={lowStockCount}
          trend={lowStockCount > 0 ? { label: "Needs replenishment", tone: "bad" } : { label: "No alerts", tone: "good" }}
        />
        <MetricCard title="Tracked locations" value={locations.length} />
      </div>

      <div data-tour="inventory:stock-locations">
      <TableToolbar>
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
              placeholder="Search by product, SKU, or location"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Location</span>
            <select
              className="ui-select"
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Sort</span>
            <select className="ui-select" value={sort} onChange={(event) => setSort(event.target.value as "product" | "location" | "quantity")}>
              <option value="product">Product</option>
              <option value="location">Location</option>
              <option value="quantity">Lowest quantity first</option>
            </select>
          </label>
          <label className="mb-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => {
                setLowStockOnly(event.target.checked);
                setPage(1);
              }}
            />
            <span className="text-sm text-[var(--foreground)]">Low stock only</span>
          </label>
        </div>
        <Button onClick={openLocationCreate}>New Stock Location</Button>
      </TableToolbar>

      <DataTable>
        <Table className="min-w-[1100px]">
          <TableHead>
            <Th>Product</Th>
            <Th>Location</Th>
            <Th>Company</Th>
            <Th className="text-right">Qty on hand</Th>
            <Th className="text-right">Reorder point</Th>
            <Th>Status</Th>
            <Th className="w-40">Actions</Th>
          </TableHead>
          <TBody>
            {pageRows.length === 0 ? (
              <TableEmptyState colSpan={7} message="No inventory rows found." />
            ) : null}
            {pageRows.map((row) => {
              const reorder = Number(row.reorder_point ?? 0);
              const quantity = Number(row.quantity_on_hand ?? 0);
              const lowStock = reorder > 0 && quantity < reorder;
              return (
                <Tr key={row.id} className={lowStock ? "bg-amber-50/40" : ""}>
                  <Td>
                    <LinkCell href={`/products/${row.product_id}`} title={row.product_name} subtitle={row.product_sku ?? "No SKU"} />
                  </Td>
                  <Td>
                    <p className="font-medium text-[var(--foreground)]">{row.location_name}</p>
                    <p className="text-xs text-[var(--muted)]">{(row.location_type ?? "other").replace(/_/g, " ")}</p>
                  </Td>
                  <Td>{row.company_name}</Td>
                  <Td className="text-right font-semibold">{quantity}</Td>
                  <Td className="text-right">{row.reorder_point ?? "—"}</Td>
                  <Td>
                    {lowStock ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700">Low stock</span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700">Healthy</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Tooltip placement="top">
                        <TooltipTrigger>
                      <button
                        className="text-[var(--accent)] hover:underline"
                        onClick={() =>
                          setAdjustment({
                            productId: row.product_id,
                            stockLocationId: row.stock_location_id,
                            productName: row.product_name,
                            locationName: row.location_name,
                          })
                        }
                      >
                        Adjust
                      </button>
                        </TooltipTrigger>
                        <TooltipContent>Change stock level</TooltipContent>
                      </Tooltip>
                      <button
                        className="text-[var(--accent)] hover:underline"
                        onClick={() => {
                          const location = locations.find((entry) => entry.id === row.stock_location_id);
                          if (location) openLocationEdit(location);
                        }}
                      >
                        Edit location
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </DataTable>
      </div>

      <TablePagination
        page={currentPage}
        totalPages={totalPages}
        totalRows={filtered.length}
        showingFrom={(currentPage - 1) * PAGE_SIZE + (pageRows.length ? 1 : 0)}
        showingTo={(currentPage - 1) * PAGE_SIZE + pageRows.length}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

      <StockLocationFormModal
        key={`${editingLocation?.id ?? "new"}-${locationModalOpen ? "open" : "closed"}`}
        open={locationModalOpen}
        onClose={() => {
          setLocationModalOpen(false);
          setEditingLocation(null);
          router.refresh();
        }}
        location={editingLocation}
        companies={companies}
        properties={properties}
        buildings={buildings}
        units={units}
        saveAction={saveStockLocation}
      />

      <Modal
        open={Boolean(adjustment)}
        onClose={() => {
          setAdjustment(null);
          setAdjustQuantity("");
          setAdjustNotes("");
        }}
        title="Adjust inventory"
        description={
          adjustment
            ? `${adjustment.productName} at ${adjustment.locationName}`
            : undefined
        }
        className="max-w-lg"
      >
        <div className="space-y-3">
          <FormField label="Quantity change">
            <input
              className="ui-input"
              type="number"
              step="0.0001"
              value={adjustQuantity}
              onChange={(event) => setAdjustQuantity(event.target.value)}
              placeholder="Use negative to deduct, positive to add"
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              className="ui-textarea"
              rows={3}
              value={adjustNotes}
              onChange={(event) => setAdjustNotes(event.target.value)}
            />
          </FormField>
          <div className="flex gap-2">
            <Button disabled={isPending} onClick={runAdjustment} className="flex-1">
              {isPending ? "Saving…" : "Record adjustment"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setAdjustment(null);
                setAdjustQuantity("");
                setAdjustNotes("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4" data-tour="inventory:transactions">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent inventory transactions</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Audited movement history for receipts, work-order usage, and adjustments.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Product</th>
                <th className="px-2 py-2">Location</th>
                <th className="px-2 py-2 text-right">Qty Delta</th>
                <th className="px-2 py-2 text-right">Unit Cost Snapshot</th>
                <th className="px-2 py-2">Reference</th>
                <th className="px-2 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-center text-[var(--muted)]" colSpan={8}>
                    No inventory transactions yet.
                  </td>
                </tr>
              ) : null}
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-[var(--card-border)] last:border-0">
                  <td className="px-2 py-2 text-[var(--foreground)]">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-[var(--muted)]">
                    {tx.transaction_type?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-2 py-2">
                    {tx.product_id ? (
                      <Link href={`/products/${tx.product_id}`} className="text-[var(--accent)] hover:underline">
                        {tx.product_name}
                      </Link>
                    ) : (
                      tx.product_name
                    )}
                    {tx.product_sku ? (
                      <p className="text-xs text-[var(--muted)]">{tx.product_sku}</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-[var(--foreground)]">{tx.stock_location_name}</td>
                  <td
                    className={`px-2 py-2 text-right font-semibold ${
                      tx.quantity_change < 0 ? "text-red-600" : "text-emerald-700"
                    }`}
                  >
                    {tx.quantity_change > 0 ? "+" : ""}
                    {tx.quantity_change}
                  </td>
                  <td className="px-2 py-2 text-right text-[var(--foreground)]">
                    {tx.unit_cost_snapshot != null
                      ? `$${Number(tx.unit_cost_snapshot).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-2 py-2 text-[var(--muted)]">
                    {tx.reference_po_id ? (
                      <Link
                        href={`/purchase-orders/${tx.reference_po_id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        Purchase order
                      </Link>
                    ) : tx.reference_work_order_id ? (
                      <Link
                        href={`/work-orders/${tx.reference_work_order_id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        Work order
                      </Link>
                    ) : (
                      tx.reference_type?.replace(/_/g, " ") ?? "Manual"
                    )}
                  </td>
                  <td className="px-2 py-2 text-[var(--muted)]">{tx.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LinkCell({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link href={href} className="block">
      <p className="font-medium text-[var(--accent)] hover:underline">{title}</p>
      <p className="text-xs text-[var(--muted)]">{subtitle}</p>
    </Link>
  );
}
