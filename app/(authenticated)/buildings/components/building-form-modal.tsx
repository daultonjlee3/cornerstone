"use client";

import { useActionState, useEffect } from "react";

export type Building = {
  id: string;
  building_name: string | null;
  name?: string;
  property_id: string;
  building_code: string | null;
  status: string;
  year_built: number | null;
  floors: number | null;
  square_feet: number | null;
  notes: string | null;
  property?: { name: string; company_id?: string } | { property_name: string; company_id?: string } | null;
};

type PropertyOption = { id: string; name: string };

type BuildingFormModalProps = {
  open: boolean;
  onClose: () => void;
  building: Building | null;
  properties: PropertyOption[];
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

const emptyBuilding: Building = {
  id: "",
  building_name: "",
  property_id: "",
  building_code: null,
  status: "active",
  year_built: null,
  floors: null,
  square_feet: null,
  notes: null,
};

export function BuildingFormModal({
  open,
  onClose,
  building,
  properties,
  saveAction,
}: BuildingFormModalProps) {
  const isEdit = !!building?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  if (!open) return null;

  const b = building ?? emptyBuilding;
  const displayName = b.building_name ?? b.name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="sticky top-0 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit Building" : "New Building"}
          </h2>
        </div>
        <form action={formAction} className="space-y-4 p-6">
          {isEdit && <input type="hidden" name="id" value={b.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="building_name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Building name *
            </label>
            <input
              id="building_name"
              name="building_name"
              type="text"
              required
              defaultValue={displayName}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="property_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Property *
            </label>
            <select
              id="property_id"
              name="property_id"
              required
              defaultValue={b.property_id}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">Select property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="building_code" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Building code
            </label>
            <input
              id="building_code"
              name="building_code"
              type="text"
              defaultValue={b.building_code ?? ""}
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
              defaultValue={b.status}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="year_built" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Year built
              </label>
              <input
                id="year_built"
                name="year_built"
                type="number"
                min={1800}
                max={2100}
                defaultValue={b.year_built ?? ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label htmlFor="floors" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Floors
              </label>
              <input
                id="floors"
                name="floors"
                type="number"
                min={0}
                defaultValue={b.floors ?? ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
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
              defaultValue={b.square_feet ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={b.notes ?? ""}
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
