"use client";

import { useState } from "react";
import { useTransition } from "react";
import { addWorkOrderPartUsage } from "../actions";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";
const btnClass =
  "rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

type PartUsageRow = {
  id: string;
  quantity_used: number;
  unit_cost: number | null;
  total_cost: number | null;
  created_at: string;
};

type WorkOrderPartsCardProps = {
  workOrderId: string;
  partUsage: PartUsageRow[];
  onPartsChange: () => void;
};

export function WorkOrderPartsCard({ workOrderId, partUsage, onPartsChange }: WorkOrderPartsCardProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [addPending, startAddTransition] = useTransition();

  const handleAdd = () => {
    const numQty = parseFloat(qty);
    if (Number.isNaN(numQty) || numQty < 0) return;
    const uc = unitCost ? parseFloat(unitCost) : null;
    const tc = totalCost ? parseFloat(totalCost) : null;
    startAddTransition(async () => {
      const result = await addWorkOrderPartUsage(workOrderId, numQty, uc, tc);
      if (result.error) return;
      setQty("");
      setUnitCost("");
      setTotalCost("");
      setAddOpen(false);
      onPartsChange();
    });
  };

  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Parts & materials</h2>
      {partUsage.length === 0 && !addOpen ? (
        <p className="text-sm text-[var(--muted)]">No parts recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="py-2 text-left font-medium text-[var(--muted)]">Part / product</th>
                <th className="py-2 text-right font-medium text-[var(--muted)]">Qty</th>
                <th className="py-2 text-right font-medium text-[var(--muted)]">Unit cost</th>
                <th className="py-2 text-right font-medium text-[var(--muted)]">Total cost</th>
              </tr>
            </thead>
            <tbody>
              {partUsage.map((p) => (
                <tr key={p.id} className="border-b border-[var(--card-border)] last:border-0">
                  <td className="py-2 text-[var(--foreground)]">—</td>
                  <td className="py-2 text-right text-[var(--foreground)]">{p.quantity_used}</td>
                  <td className="py-2 text-right text-[var(--foreground)]">
                    {p.unit_cost != null ? `$${Number(p.unit_cost).toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2 text-right text-[var(--foreground)]">
                    {p.total_cost != null ? `$${Number(p.total_cost).toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {addOpen ? (
        <div className="mt-4 space-y-3 rounded border border-[var(--card-border)] bg-[var(--background)] p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-0.5 block text-xs text-[var(--muted)]">Quantity used</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded border border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-[var(--muted)]">Unit cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full rounded border border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-[var(--muted)]">Total cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="w-full rounded border border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={addPending || (qty === "" || parseFloat(qty) < 0)}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {addPending ? "Adding…" : "Add part usage"}
            </button>
            <button type="button" onClick={() => { setAddOpen(false); setQty(""); setUnitCost(""); setTotalCost(""); }} className={btnClass}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAddOpen(true)} className={`mt-4 ${btnClass}`}>
          Add part usage
        </button>
      )}
    </div>
  );
}
