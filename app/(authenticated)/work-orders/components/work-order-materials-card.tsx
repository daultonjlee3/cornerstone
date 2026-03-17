"use client";

import { useState, useTransition } from "react";
import {
  addWorkOrderMaterialLine,
  getAvailabilityForProduct,
  issueWorkOrderMaterial,
  releaseWorkOrderReservation,
  removeWorkOrderMaterialLine,
  reserveWorkOrderMaterial,
  updateWorkOrderMaterialLine,
  type WorkOrderMaterialLineWithAvailability,
} from "../actions";
import { Button } from "@/src/components/ui/button";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";
const inputClass =
  "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";
const btnSecondary =
  "rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80";

type WorkOrderMaterialsCardProps = {
  workOrderId: string;
  companyId: string;
  materialLines: WorkOrderMaterialLineWithAvailability[];
  products: { id: string; name: string; sku: string | null; default_cost: number | null }[];
  stockLocations: { id: string; name: string }[];
  onMaterialsChange: () => void;
};

export function WorkOrderMaterialsCard({
  workOrderId,
  companyId,
  materialLines: initialLines,
  products,
  stockLocations,
  onMaterialsChange,
}: WorkOrderMaterialsCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [productId, setProductId] = useState("");
  const [requiredQty, setRequiredQty] = useState("");
  const [stockLocationId, setStockLocationId] = useState(stockLocations[0]?.id ?? "");
  const [unitCost, setUnitCost] = useState("");
  const [availability, setAvailability] = useState<{ on_hand: number; reserved: number; available: number } | { by_location: Array<{ stock_location_id: string; location_name: string; on_hand: number; reserved: number; available: number }> } | null>(null);
  const [actionLineId, setActionLineId] = useState<string | null>(null);
  const [actionQty, setActionQty] = useState("");
  const [actionModal, setActionModal] = useState<"reserve" | "issue" | "release" | "edit" | null>(null);
  const [editRequiredQty, setEditRequiredQty] = useState("");
  const [editLocationId, setEditLocationId] = useState("");

  const refreshAvailability = (pid: string, locId?: string | null) => {
    if (!pid) {
      setAvailability(null);
      return;
    }
    getAvailabilityForProduct(companyId, pid, locId ?? undefined).then((res) => {
      if (res.data) setAvailability(res.data);
      else setAvailability(null);
    });
  };

  const openAddModal = () => {
    setMessage(null);
    setProductId("");
    setRequiredQty("");
    setStockLocationId(stockLocations[0]?.id ?? "");
    setUnitCost("");
    setAvailability(null);
    setModalOpen(true);
  };

  const handleAddMaterial = () => {
    setMessage(null);
    const qty = parseFloat(requiredQty);
    if (Number.isNaN(qty) || qty <= 0) {
      setMessage({ type: "error", text: "Required quantity must be greater than zero." });
      return;
    }
    if (!productId) {
      setMessage({ type: "error", text: "Select a product." });
      return;
    }
    startTransition(async () => {
      const result = await addWorkOrderMaterialLine(workOrderId, {
        product_id: productId,
        required_quantity: qty,
        stock_location_id: stockLocationId || null,
        unit_cost_snapshot: unitCost ? parseFloat(unitCost) : null,
      });
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Material line added." });
        setModalOpen(false);
        onMaterialsChange();
      }
    });
  };

  const openAction = (lineId: string, action: "reserve" | "issue" | "release" | "edit") => {
    setActionLineId(lineId);
    setActionQty("");
    setActionModal(action);
    setMessage(null);
    if (action === "edit") {
      const l = initialLines.find((x) => x.id === lineId);
      if (l) {
        setEditRequiredQty(String(l.required_quantity));
        setEditLocationId(l.stock_location_id ?? "");
      }
    }
  };

  const runEdit = () => {
    if (!actionLineId) return;
    const qty = parseFloat(editRequiredQty);
    if (Number.isNaN(qty) || qty < 0) {
      setMessage({ type: "error", text: "Required quantity must be zero or greater." });
      return;
    }
    startTransition(async () => {
      const result = await updateWorkOrderMaterialLine(actionLineId, {
        required_quantity: qty,
        stock_location_id: editLocationId || null,
      });
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Material line updated." });
        setActionModal(null);
        onMaterialsChange();
      }
    });
  };

  const runReserve = () => {
    if (!actionLineId) return;
    const qty = parseFloat(actionQty);
    if (Number.isNaN(qty) || qty <= 0) {
      setMessage({ type: "error", text: "Enter a quantity to reserve." });
      return;
    }
    startTransition(async () => {
      const result = await reserveWorkOrderMaterial(actionLineId, qty);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Reservation updated." });
        setActionModal(null);
        onMaterialsChange();
      }
    });
  };

  const runIssue = () => {
    if (!actionLineId) return;
    const qty = parseFloat(actionQty);
    if (Number.isNaN(qty) || qty <= 0) {
      setMessage({ type: "error", text: "Enter a quantity to issue." });
      return;
    }
    startTransition(async () => {
      const result = await issueWorkOrderMaterial(actionLineId, qty);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Material issued." });
        setActionModal(null);
        onMaterialsChange();
      }
    });
  };

  const runRelease = () => {
    if (!actionLineId) return;
    startTransition(async () => {
      const result = await releaseWorkOrderReservation(actionLineId, actionQty ? parseFloat(actionQty) : undefined);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Reservation released." });
        setActionModal(null);
        onMaterialsChange();
      }
    });
  };

  const handleRemove = (line: WorkOrderMaterialLineWithAvailability) => {
    if (line.issued_quantity > 0) return;
    if (!confirm("Remove this material line?")) return;
    startTransition(async () => {
      const result = await removeWorkOrderMaterialLine(line.id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Line removed." });
        onMaterialsChange();
      }
    });
  };

  const line = actionLineId ? initialLines.find((l) => l.id === actionLineId) : null;
  const canReserve = line && line.stock_location_id && line.reserved_quantity < line.required_quantity && (line.available_at_location ?? 0) > 0;
  const canIssue = line && line.reserved_quantity > line.issued_quantity;
  const canRelease = line && line.reserved_quantity > line.issued_quantity;
  const canEdit = line && line.issued_quantity === 0;

  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Materials (plan & reserve)</h2>
      {message && (
        <div
          className={`mb-3 rounded px-3 py-2 text-sm ${message.type === "error" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700"}`}
        >
          {message.text}
        </div>
      )}
      {initialLines.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No material lines. Add required materials, reserve stock, then issue when used.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left font-medium text-[var(--muted)]">
                <th className="py-2">Product</th>
                <th className="py-2 text-right">Required</th>
                <th className="py-2 text-right">Reserved</th>
                <th className="py-2 text-right">Issued</th>
                <th className="py-2 text-right">Available</th>
                <th className="py-2">Location</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialLines.map((l) => (
                <tr key={l.id} className="border-b border-[var(--card-border)] last:border-0">
                  <td className="py-2 text-[var(--foreground)]">
                    {l.product_name ?? "—"}
                    {l.product_sku ? ` (${l.product_sku})` : ""}
                  </td>
                  <td className="py-2 text-right">{l.required_quantity}</td>
                  <td className="py-2 text-right">{l.reserved_quantity}</td>
                  <td className="py-2 text-right">{l.issued_quantity}</td>
                  <td className="py-2 text-right">
                    {l.available_at_location != null ? l.available_at_location : "—"}
                  </td>
                  <td className="py-2 text-[var(--muted)]">{l.stock_location_name ?? "—"}</td>
                  <td className="py-2">
                    <span className="capitalize text-[var(--muted)]">{l.status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {canReserve && (
                        <button
                          type="button"
                          className="text-xs text-[var(--accent)] hover:underline"
                          onClick={() => openAction(l.id, "reserve")}
                        >
                          Reserve
                        </button>
                      )}
                      {canIssue && (
                        <button
                          type="button"
                          className="text-xs text-[var(--accent)] hover:underline"
                          onClick={() => openAction(l.id, "issue")}
                        >
                          Issue
                        </button>
                      )}
                      {canRelease && (
                        <button
                          type="button"
                          className="text-xs text-amber-600 hover:underline"
                          onClick={() => openAction(l.id, "release")}
                        >
                          Release
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          className="text-xs text-[var(--muted)] hover:underline"
                          onClick={() => openAction(l.id, "edit")}
                        >
                          Edit
                        </button>
                      )}
                      {l.issued_quantity === 0 && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => handleRemove(l)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={openAddModal}>
          Add material
        </Button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-material-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-xl">
            <h2 id="add-material-title" className="text-lg font-semibold text-[var(--foreground)]">
              Add material
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Required quantity and optional stock location. Reserve and issue from the table.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Product *</span>
                <select
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    refreshAvailability(e.target.value, stockLocationId || undefined);
                  }}
                  className={inputClass}
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.sku ? ` (${p.sku})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Stock location</span>
                <select
                  value={stockLocationId}
                  onChange={(e) => {
                    setStockLocationId(e.target.value);
                    if (productId) refreshAvailability(productId, e.target.value || undefined);
                  }}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {stockLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>
              {availability && "available" in availability && (
                <p className="text-xs text-[var(--muted)]">
                  Available at location: {availability.available} (on hand: {availability.on_hand}, reserved: {availability.reserved})
                </p>
              )}
              {availability && "by_location" in availability && availability.by_location.length > 0 && !stockLocationId && (
                <p className="text-xs text-[var(--muted)]">
                  Total on hand: {availability.by_location.reduce((s, l) => s + l.on_hand, 0)}; by location:{" "}
                  {availability.by_location.map((l) => `${l.location_name}: ${l.available}`).join(", ")}
                </p>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Required quantity *</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={requiredQty}
                  onChange={(e) => setRequiredQty(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Unit cost (snapshot)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder={products.find((p) => p.id === productId)?.default_cost != null ? `Default: $${Number(products.find((p) => p.id === productId)!.default_cost).toFixed(2)}` : undefined}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleAddMaterial} disabled={isPending || !productId || !requiredQty}>
                {isPending ? "Adding…" : "Add"}
              </Button>
              <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal && line && actionModal !== "edit" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-xl">
            <h3 className="font-semibold text-[var(--foreground)]">
              {actionModal === "reserve" && "Reserve"}
              {actionModal === "issue" && "Issue"}
              {actionModal === "release" && "Release"}
              {" — "}
              {line.product_name}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Required: {line.required_quantity} · Reserved: {line.reserved_quantity} · Issued: {line.issued_quantity}
              {actionModal === "reserve" && line.available_at_location != null && ` · Available: ${line.available_at_location}`}
            </p>
            {(actionModal === "reserve" || actionModal === "issue") && (
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Quantity</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={actionQty}
                  onChange={(e) => setActionQty(e.target.value)}
                  className={inputClass}
                />
              </label>
            )}
            {actionModal === "release" && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Optional: enter quantity to release, or leave empty to release all.
              </p>
            )}
            {actionModal === "release" && (
              <label className="mt-2 block">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Quantity to release (optional)</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={actionQty}
                  onChange={(e) => setActionQty(e.target.value)}
                  placeholder="All"
                  className={inputClass}
                />
              </label>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                disabled={
                  isPending ||
                  (actionModal === "reserve" && (!actionQty || parseFloat(actionQty) <= 0)) ||
                  (actionModal === "issue" && (!actionQty || parseFloat(actionQty) <= 0))
                }
                onClick={() => {
                  if (actionModal === "reserve") runReserve();
                  else if (actionModal === "issue") runIssue();
                  else runRelease();
                }}
              >
                {actionModal === "reserve" && "Reserve"}
                {actionModal === "issue" && "Issue"}
                {actionModal === "release" && "Release"}
              </Button>
              <button type="button" onClick={() => setActionModal(null)} className={btnSecondary}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal === "edit" && line && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-xl">
            <h3 className="font-semibold text-[var(--foreground)]">Edit — {line.product_name}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Required and location only (no issued quantity yet).</p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Required quantity</span>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={editRequiredQty}
                onChange={(e) => setEditRequiredQty(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="mt-2 block">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Stock location</span>
              <select
                value={editLocationId}
                onChange={(e) => setEditLocationId(e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {stockLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex gap-2">
              <Button disabled={isPending} onClick={runEdit}>
                Save
              </Button>
              <button type="button" onClick={() => setActionModal(null)} className={btnSecondary}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
