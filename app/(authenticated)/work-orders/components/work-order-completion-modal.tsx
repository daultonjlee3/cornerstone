"use client";

import { useTransition, useState } from "react";
import type { WorkOrderCompletionPayload } from "../actions";
import {
  completeWorkOrder,
  addWorkOrderPartUsage,
  type AddPartUsagePayload,
  uploadWorkOrderPhoto,
} from "../actions";
import { PhotoUploader } from "@/src/components/ui/photo-uploader";

type TechnicianOption = { id: string; name: string };
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

type QueuedPart = {
  id: string;
  payload: AddPartUsagePayload;
  displayName: string;
};

const COMPLETION_STATUS_OPTIONS = [
  { value: "successful", label: "Successful" },
  { value: "partially_completed", label: "Partially completed" },
  { value: "deferred", label: "Deferred" },
  { value: "unable_to_complete", label: "Unable to complete" },
] as const;

type WorkOrderCompletionModalProps = {
  workOrderId: string;
  workOrderTitle: string;
  technicians: TechnicianOption[];
  assignedTechnicianId: string | null;
  estimatedHours: number | null;
  inventoryItems?: InventoryItemOption[];
  technicianIdForUpload?: string | null;
  enforceChecklistCompletion?: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const inputClass =
  "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";
const labelClass = "mb-1 block text-xs font-medium text-[var(--foreground)]";
const labelOptionalClass = "mb-1 block text-xs font-medium text-[var(--muted)]";
const sectionTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)] border-b border-[var(--card-border)] pb-2";

function defaultCompletedAt(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function WorkOrderCompletionModal({
  workOrderId,
  workOrderTitle,
  technicians,
  assignedTechnicianId,
  estimatedHours,
  inventoryItems = [],
  technicianIdForUpload = null,
  enforceChecklistCompletion = false,
  onClose,
  onSuccess,
}: WorkOrderCompletionModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [completedAt, setCompletedAt] = useState(defaultCompletedAt());
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [partsUsedSummary, setPartsUsedSummary] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [actualHours, setActualHours] = useState<string>(estimatedHours != null ? String(estimatedHours) : "");
  const [vendorCost, setVendorCost] = useState("");
  const [completionStatus, setCompletionStatus] = useState<string>("successful");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [customerVisibleSummary, setCustomerVisibleSummary] = useState("");
  const [internalCompletionNotes, setInternalCompletionNotes] = useState("");
  const [completedByTechnicianId, setCompletedByTechnicianId] = useState<string>(assignedTechnicianId ?? "");
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [inventoryOptionId, setInventoryOptionId] = useState("");
  const [partNameManual, setPartNameManual] = useState("");
  const [partQty, setPartQty] = useState("");
  const [partUnitCost, setPartUnitCost] = useState("");
  const [partNotes, setPartNotes] = useState("");
  const [partDeductInventory, setPartDeductInventory] = useState(true);
  const [queuedParts, setQueuedParts] = useState<QueuedPart[]>([]);

  const selectedItem = inventoryOptionId
    ? inventoryItems.find((item) => item.id === inventoryOptionId)
    : null;
  const effectivePartCost =
    partUnitCost !== ""
      ? partUnitCost
      : selectedItem?.cost != null
        ? String(selectedItem.cost)
        : "";

  const queuePart = () => {
    setError(null);
    const qty = Number(partQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Part quantity must be greater than zero.");
      return;
    }
    const unitCostValue =
      effectivePartCost === "" ? null : Number(effectivePartCost);
    if (unitCostValue != null && (!Number.isFinite(unitCostValue) || unitCostValue < 0)) {
      setError("Part unit cost must be zero or greater.");
      return;
    }
    if (!inventoryOptionId && !partNameManual.trim()) {
      setError("Select an inventory product or provide a part name.");
      return;
    }

    const payload: AddPartUsagePayload = {
      quantity_used: qty,
      unit_cost: unitCostValue,
      notes: partNotes.trim() || undefined,
      deduct_inventory: Boolean(inventoryOptionId && partDeductInventory),
    };
    let displayName = partNameManual.trim();
    if (selectedItem) {
      payload.product_id = selectedItem.product_id;
      payload.stock_location_id = selectedItem.stock_location_id;
      payload.part_name_snapshot = selectedItem.name;
      payload.sku_snapshot = selectedItem.sku ?? null;
      payload.unit_of_measure = selectedItem.unit ?? null;
      displayName = selectedItem.name;
    } else {
      payload.part_name_snapshot = partNameManual.trim();
    }

    setQueuedParts((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        payload,
        displayName: displayName || "Part",
      },
    ]);
    setInventoryOptionId("");
    setPartNameManual("");
    setPartQty("");
    setPartUnitCost("");
    setPartNotes("");
    setPartDeductInventory(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const summary = resolutionSummary.trim();
    if (!summary) {
      setError("Resolution summary is required.");
      return;
    }
    if (vendorCost) {
      const parsedVendorCost = Number(vendorCost);
      if (!Number.isFinite(parsedVendorCost) || parsedVendorCost < 0) {
        setError("External vendor cost must be zero or greater.");
        return;
      }
    }
    startTransition(async () => {
      let remainingParts = [...queuedParts];
      for (let index = 0; index < queuedParts.length; index += 1) {
        const queuedPart = queuedParts[index];
        const partResult = await addWorkOrderPartUsage(workOrderId, queuedPart.payload);
        if (partResult.error) {
          remainingParts = queuedParts.slice(index);
          setQueuedParts(remainingParts);
          setError(`Failed to log part "${queuedPart.displayName}": ${partResult.error}`);
          return;
        }
      }

      const payload: WorkOrderCompletionPayload = {
        completed_at: completedAt ? new Date(completedAt).toISOString() : null,
        completion_date: completedAt ? completedAt.slice(0, 10) : null,
        resolution_summary: summary,
        completion_notes: completionNotes.trim() || null,
        parts_used_summary: partsUsedSummary.trim() || null,
        root_cause: rootCause.trim() || null,
        actual_hours: actualHours ? parseFloat(actualHours) : null,
        vendor_cost: vendorCost ? parseFloat(vendorCost) : null,
        follow_up_required: followUpRequired,
        customer_visible_summary: customerVisibleSummary.trim() || null,
        internal_completion_notes: internalCompletionNotes.trim() || null,
        completed_by_technician_id: completedByTechnicianId || null,
        completion_status: completionStatus || null,
        enforce_checklist_completion: enforceChecklistCompletion,
      };
      const result = await completeWorkOrder(workOrderId, payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      setQueuedParts([]);
      onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="completion-modal-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl"
      >
        <div className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 id="completion-modal-title" className="text-lg font-semibold text-[var(--foreground)]">
            Complete work order
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{workOrderTitle}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {enforceChecklistCompletion ? (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              All required checklist items must be completed before this work order can be closed.
            </p>
          ) : null}
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          {/* A. Completion Summary */}
          <div>
            <h3 className={sectionTitleClass}>Completion summary</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="completion-completed-at" className={labelClass}>
                  Completion date & time
                </label>
                <input
                  id="completion-completed-at"
                  type="datetime-local"
                  value={completedAt}
                  onChange={(e) => setCompletedAt(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="completion-resolution-summary" className={labelClass}>
                  Resolution summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="completion-resolution-summary"
                  required
                  rows={3}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="What was done? What was the outcome?"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="completion-notes" className={labelOptionalClass}>
                  Completion notes (optional)
                </label>
                <textarea
                  id="completion-notes"
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="completion-root-cause" className={labelOptionalClass}>
                  Condition observed (optional)
                </label>
                <input
                  id="completion-root-cause"
                  type="text"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="completion-parts-used" className={labelOptionalClass}>
                  Parts used (optional)
                </label>
                <textarea
                  id="completion-parts-used"
                  rows={2}
                  value={partsUsedSummary}
                  onChange={(e) => setPartsUsedSummary(e.target.value)}
                  placeholder="Summarize parts/materials used if not logged in Parts & materials."
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="completion-status" className={labelClass}>
                  Completion result
                </label>
                <select
                  id="completion-status"
                  value={completionStatus}
                  onChange={(e) => setCompletionStatus(e.target.value)}
                  className={inputClass}
                >
                  {COMPLETION_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* B. Labor & Outcome */}
          <div>
            <h3 className={sectionTitleClass}>Labor & outcome</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="completion-actual-hours" className={labelOptionalClass}>
                  Actual labor hours
                </label>
                <input
                  id="completion-actual-hours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="completion-completed-by" className={labelOptionalClass}>
                  Completed by technician
                </label>
                <select
                  id="completion-completed-by"
                  value={completedByTechnicianId}
                  onChange={(e) => setCompletedByTechnicianId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="completion-vendor-cost" className={labelOptionalClass}>
                  External vendor cost
                </label>
                <input
                  id="completion-vendor-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={vendorCost}
                  onChange={(e) => setVendorCost(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={followUpRequired}
                  onChange={(e) => setFollowUpRequired(e.target.checked)}
                  className="rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span className="text-sm text-[var(--foreground)]">Follow-up required</span>
              </label>
            </div>
          </div>

          {/* B2. Parts used */}
          <div>
            <h3 className={sectionTitleClass}>Parts used</h3>
            <p className="mb-3 text-xs text-[var(--muted)]">
              Record parts during closeout; inventory can be deducted automatically.
            </p>
            <div className="space-y-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
              <div>
                <label htmlFor="completion-part-stocked" className={labelOptionalClass}>
                  Product from inventory
                </label>
                <select
                  id="completion-part-stocked"
                  value={inventoryOptionId}
                  onChange={(e) => {
                    setInventoryOptionId(e.target.value);
                    setPartUnitCost("");
                  }}
                  className={inputClass}
                >
                  <option value="">Manual entry</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.sku ? ` (${item.sku})` : ""} — {item.quantity} on hand
                      {item.location_name ? ` @ ${item.location_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {!inventoryOptionId ? (
                <div>
                  <label htmlFor="completion-part-name" className={labelOptionalClass}>
                    Part / product name
                  </label>
                  <input
                    id="completion-part-name"
                    type="text"
                    value={partNameManual}
                    onChange={(e) => setPartNameManual(e.target.value)}
                    className={inputClass}
                  />
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="completion-part-qty" className={labelOptionalClass}>
                    Quantity used
                  </label>
                  <input
                    id="completion-part-qty"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={partQty}
                    onChange={(e) => setPartQty(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="completion-part-cost" className={labelOptionalClass}>
                    Unit cost
                  </label>
                  <input
                    id="completion-part-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={effectivePartCost}
                    onChange={(e) => setPartUnitCost(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="completion-part-notes" className={labelOptionalClass}>
                  Part notes
                </label>
                <input
                  id="completion-part-notes"
                  type="text"
                  value={partNotes}
                  onChange={(e) => setPartNotes(e.target.value)}
                  className={inputClass}
                />
              </div>
              {inventoryOptionId ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={partDeductInventory}
                    onChange={(e) => setPartDeductInventory(e.target.checked)}
                    className="rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">Deduct from inventory</span>
                </label>
              ) : null}
              <button
                type="button"
                onClick={queuePart}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
              >
                Add part to completion
              </button>
            </div>
            {queuedParts.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {queuedParts.map((part) => (
                  <li
                    key={part.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{part.displayName}</p>
                      <p className="text-xs text-[var(--muted)]">
                        Qty {part.payload.quantity_used}
                        {part.payload.unit_cost != null
                          ? ` • $${Number(part.payload.unit_cost).toFixed(2)}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setQueuedParts((current) =>
                          current.filter((entry) => entry.id !== part.id)
                        )
                      }
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* B3. Completion photos */}
          <div>
            <h3 className={sectionTitleClass}>Completion photos</h3>
            {photoMessage ? (
              <p className="mb-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
                {photoMessage}
              </p>
            ) : null}
            <PhotoUploader
              onUpload={async (photoPayload) => {
                const result = await uploadWorkOrderPhoto(workOrderId, {
                  ...photoPayload,
                  technicianId: technicianIdForUpload ?? (completedByTechnicianId || null),
                });
                if (result.error) throw new Error(result.error);
                setPhotoMessage("Photo uploaded.");
              }}
              disabled={isPending}
            />
          </div>

          {/* C. Customer notes */}
          <div>
            <h3 className={sectionTitleClass}>Customer notes</h3>
            <label htmlFor="completion-customer-summary" className={labelOptionalClass}>
              Customer-visible completion summary
            </label>
            <textarea
              id="completion-customer-summary"
              rows={2}
              value={customerVisibleSummary}
              onChange={(e) => setCustomerVisibleSummary(e.target.value)}
              placeholder="Summary suitable for customer communication"
              className={inputClass}
            />
          </div>

          {/* D. Internal notes */}
          <div>
            <h3 className={sectionTitleClass}>Internal notes</h3>
            <label htmlFor="completion-internal-notes" className={labelOptionalClass}>
              Internal-only completion notes
            </label>
            <textarea
              id="completion-internal-notes"
              rows={2}
              value={internalCompletionNotes}
              onChange={(e) => setInternalCompletionNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 border-t border-[var(--card-border)] pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {isPending ? "Completing…" : "Complete work order"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-[var(--foreground)] hover:bg-[var(--background)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
