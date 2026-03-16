"use client";

import { useState, useTransition } from "react";
import { addWorkOrderPartUsage, type AddPartUsagePayload } from "../actions";
import { formatDate } from "@/src/lib/date-utils";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";
const btnClass =
  "rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const inputClass =
  "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

type PartUsageRow = {
  id: string;
  product_id?: string | null;
  quantity_used: number;
  unit_cost_snapshot?: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  created_at: string;
  part_name_snapshot: string | null;
  sku_snapshot: string | null;
  unit_of_measure: string | null;
  used_at: string | null;
  stock_location_name?: string | null;
  notes?: string | null;
};

type InventoryItemOption = {
  id: string;
  product_id: string;
  stock_location_id: string;
  name: string;
  location_name: string;
  sku: string | null;
  unit: string | null;
  cost: number | null;
  quantity: number;
};

type WorkOrderPartsCardProps = {
  workOrderId: string;
  partUsage: PartUsageRow[];
  onPartsChange: () => void;
  inventoryItems: InventoryItemOption[];
};

export function WorkOrderPartsCard({
  workOrderId,
  partUsage,
  onPartsChange,
  inventoryItems,
}: WorkOrderPartsCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inventoryOptionId, setInventoryOptionId] = useState("");
  const [partNameManual, setPartNameManual] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [deductInventory, setDeductInventory] = useState(true);

  const selectedItem = inventoryOptionId
    ? inventoryItems.find((i) => i.id === inventoryOptionId)
    : null;
  const defaultUnitCost = selectedItem?.cost != null ? String(selectedItem.cost) : "";
  const effectiveUnitCost = unitCost !== "" ? unitCost : defaultUnitCost;

  const openModal = () => {
    setError(null);
    setInventoryOptionId("");
    setPartNameManual("");
    setQuantity("");
    setUnitCost("");
    setNotes("");
    setDeductInventory(true);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    setError(null);
    const qty = parseFloat(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    const uc = effectiveUnitCost ? parseFloat(effectiveUnitCost) : null;
    if (uc != null && (Number.isNaN(uc) || uc < 0)) {
      setError("Unit cost must be zero or greater.");
      return;
    }
    if (!inventoryOptionId && !partNameManual.trim()) {
      setError("Select a stocked product or enter a part name.");
      return;
    }

    const payload: AddPartUsagePayload = {
      quantity_used: qty,
      unit_cost: uc,
      notes: notes.trim() || undefined,
      deduct_inventory: !!inventoryOptionId && deductInventory,
    };
    if (inventoryOptionId && selectedItem) {
      payload.product_id = selectedItem.product_id;
      payload.stock_location_id = selectedItem.stock_location_id;
      payload.part_name_snapshot = selectedItem.name;
      payload.sku_snapshot = selectedItem.sku ?? null;
      payload.unit_of_measure = selectedItem.unit ?? null;
    } else {
      payload.part_name_snapshot = partNameManual.trim() || null;
    }

    startTransition(async () => {
      const result = await addWorkOrderPartUsage(workOrderId, payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      setModalOpen(false);
      onPartsChange();
    });
  };

  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Parts & materials</h2>
      {partUsage.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No parts recorded. Add part usage to track materials and cost.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="py-2 text-left font-medium text-[var(--muted)]">Part / product</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">SKU</th>
                <th className="py-2 text-right font-medium text-[var(--muted)]">Qty used</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Unit</th>
                <th className="py-2 text-right font-medium text-[var(--muted)]">Unit cost</th>
                <th className="py-2 text-right font-medium text-[var(--muted)]">Total cost</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Stock location</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Used at</th>
              </tr>
            </thead>
            <tbody>
              {partUsage.map((p) => (
                <tr key={p.id} className="border-b border-[var(--card-border)] last:border-0">
                  <td className="py-2 text-[var(--foreground)]">{p.part_name_snapshot ?? "—"}</td>
                  <td className="py-2 text-[var(--muted)]">{p.sku_snapshot ?? "—"}</td>
                  <td className="py-2 text-right text-[var(--foreground)]">{p.quantity_used}</td>
                  <td className="py-2 text-[var(--muted)]">{p.unit_of_measure ?? "—"}</td>
                  <td className="py-2 text-right text-[var(--foreground)]">
                    {p.unit_cost_snapshot != null
                      ? `$${Number(p.unit_cost_snapshot).toFixed(2)}`
                      : p.unit_cost != null
                      ? `$${Number(p.unit_cost).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="py-2 text-right text-[var(--foreground)]">
                    {p.total_cost != null ? `$${Number(p.total_cost).toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2 text-[var(--muted)]">{p.stock_location_name ?? "—"}</td>
                  <td className="py-2 text-[var(--muted)]">{formatDate(p.used_at ?? p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4">
        <button type="button" onClick={openModal} className={btnClass}>
          Add part usage
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-part-usage-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
            <div className="border-b border-[var(--card-border)] px-4 py-3">
              <h2 id="add-part-usage-title" className="text-lg font-semibold text-[var(--foreground)]">
                Add part usage
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Select a product+location balance or enter manually. Optionally deduct from stock.
              </p>
            </div>
            <div className="space-y-4 p-4">
              {error && (
                <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="part-inventory-item" className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  Product from inventory
                </label>
                <select
                  id="part-inventory-item"
                  value={inventoryOptionId}
                  onChange={(e) => {
                    setInventoryOptionId(e.target.value);
                    setUnitCost("");
                  }}
                  className={inputClass}
                >
                  <option value="">Manual entry</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.sku ? ` (${item.sku})` : ""} — {item.quantity} on hand
                      {item.location_name ? ` @ ${item.location_name}` : ""}
                      {item.cost != null ? ` · $${Number(item.cost).toFixed(2)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {!inventoryOptionId && (
                <div>
                  <label htmlFor="part-name-manual" className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    Part / product name
                  </label>
                  <input
                    id="part-name-manual"
                    type="text"
                    value={partNameManual}
                    onChange={(e) => setPartNameManual(e.target.value)}
                    placeholder="e.g. Filter, Belt"
                    className={inputClass}
                  />
                </div>
              )}
              <div>
                <label htmlFor="part-qty" className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  Quantity used *
                </label>
                <input
                  id="part-qty"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="part-unit-cost" className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  Unit cost
                </label>
                <input
                  id="part-unit-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={effectiveUnitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder={selectedItem?.cost != null ? `Default: $${Number(selectedItem.cost).toFixed(2)}` : "0.00"}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="part-notes" className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  Notes
                </label>
                <input
                  id="part-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass}
                />
              </div>
              {inventoryOptionId && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deductInventory}
                    onChange={(e) => setDeductInventory(e.target.checked)}
                    className="rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">Deduct from inventory</span>
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    isPending ||
                    !quantity ||
                    parseFloat(quantity) <= 0 ||
                    (!inventoryOptionId && !partNameManual.trim())
                  }
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {isPending ? "Adding…" : "Add"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className={btnClass}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
