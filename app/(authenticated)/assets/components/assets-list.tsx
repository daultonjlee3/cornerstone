"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { deleteAsset } from "../actions";
import type { Asset } from "./asset-form-modal";
import { AssetFormModal } from "./asset-form-modal";
import { saveAsset } from "../actions";

type CompanyOption = { id: string; name: string };
type PropertyOption = { id: string; name: string };
type BuildingOption = { id: string; name: string };
type UnitOption = { id: string; name: string };

type AssetsListProps = {
  assets: Asset[];
  companies: CompanyOption[];
  properties: PropertyOption[];
  buildings: BuildingOption[];
  units: UnitOption[];
  error?: string | null;
};

function assetDisplayName(a: Asset): string {
  return a.asset_name ?? a.name ?? "—";
}

function locationDisplay(a: Asset & { property_name?: string; building_name?: string; unit_name?: string }): string {
  const parts = [a.property_name, a.building_name, a.unit_name].filter(Boolean);
  return parts.length ? parts.join(" / ") : "—";
}

export function AssetsList({
  assets: initialAssets,
  companies,
  properties,
  buildings,
  units,
  error: initialError,
}: AssetsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete asset "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteAsset(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Asset deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingAsset(null);
    setModalOpen(true);
  };
  const openEdit = (a: Asset) => {
    setEditingAsset(a);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingAsset(null);
    router.refresh();
  };

  if (initialError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{initialError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-[var(--accent)]/10 text-[var(--accent)]"
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium text-[var(--foreground)]">Assets</h2>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          New Asset
        </button>
      </div>

      {initialAssets.length === 0 ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">No assets yet.</p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Add your first asset
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Asset</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Tag</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Location</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Category</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Status</th>
                  <th className="w-24 px-4 py-3 font-medium text-[var(--foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialAssets.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--background)]/50"
                  >
                    <td className="px-4 py-3 text-[var(--foreground)]">{assetDisplayName(a)}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{a.asset_tag ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{locationDisplay(a as Asset & { property_name?: string; building_name?: string; unit_name?: string })}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{a.category ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.status === "active"
                            ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                            : "bg-[var(--muted)]/20 text-[var(--muted)]"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/work-orders?new=1&company_id=${encodeURIComponent(a.company_id)}&property_id=${encodeURIComponent(a.property_id ?? "")}&building_id=${encodeURIComponent(a.building_id ?? "")}&unit_id=${encodeURIComponent(a.unit_id ?? "")}&asset_id=${encodeURIComponent(a.id)}`}
                          className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          Create Work Order
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id, assetDisplayName(a))}
                          disabled={isPending}
                          className="rounded text-red-500 hover:underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AssetFormModal
        open={modalOpen}
        onClose={closeModal}
        asset={editingAsset}
        companies={companies}
        properties={properties}
        buildings={buildings}
        units={units}
        saveAction={saveAsset}
      />
    </div>
  );
}
