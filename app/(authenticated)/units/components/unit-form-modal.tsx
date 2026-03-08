"use client";

import { useActionState, useEffect } from "react";

export type Unit = {
  id: string;
  unit_name: string | null;
  name_or_number?: string;
  building_id: string;
  unit_code: string | null;
  floor: string | null;
  square_feet: number | null;
  square_footage?: number | null;
  occupancy_type: string | null;
  status: string;
  notes: string | null;
  building?: { building_name?: string; name?: string } | null;
};

type BuildingOption = { id: string; name: string };

type UnitFormModalProps = {
  open: boolean;
  onClose: () => void;
  unit: Unit | null;
  buildings: BuildingOption[];
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

const emptyUnit: Unit = {
  id: "",
  unit_name: "",
  building_id: "",
  unit_code: null,
  floor: null,
  square_feet: null,
  occupancy_type: null,
  status: "active",
  notes: null,
};

export function UnitFormModal({
  open,
  onClose,
  unit,
  buildings,
  saveAction,
}: UnitFormModalProps) {
  const isEdit = !!unit?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  if (!open) return null;

  const u = unit ?? emptyUnit;
  const displayName = u.unit_name ?? u.name_or_number ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="sticky top-0 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit Unit" : "New Unit"}
          </h2>
        </div>
        <form action={formAction} className="space-y-4 p-6">
          {isEdit && <input type="hidden" name="id" value={u.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="unit_name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Unit name *
            </label>
            <input
              id="unit_name"
              name="unit_name"
              type="text"
              required
              defaultValue={displayName}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="building_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Building *
            </label>
            <select
              id="building_id"
              name="building_id"
              required
              defaultValue={u.building_id}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">Select building</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="unit_code" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Unit code
            </label>
            <input
              id="unit_code"
              name="unit_code"
              type="text"
              defaultValue={u.unit_code ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="floor" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Floor
            </label>
            <input
              id="floor"
              name="floor"
              type="text"
              defaultValue={u.floor ?? ""}
              placeholder="e.g. 2 or 2nd"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="square_feet" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Square feet
            </label>
            <input
              id="square_feet"
              name="square_feet"
              type="number"
              min={0}
              step="any"
              defaultValue={u.square_feet ?? u.square_footage ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="occupancy_type" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Occupancy type
            </label>
            <input
              id="occupancy_type"
              name="occupancy_type"
              type="text"
              defaultValue={u.occupancy_type ?? ""}
              placeholder="e.g. Office, Retail"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={u.status}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={u.notes ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {isPending ? "Saving…" : isEdit ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-[var(--foreground)] hover:bg-[var(--card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
