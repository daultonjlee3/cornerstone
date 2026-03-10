"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { deleteTechnician, saveTechnician } from "../actions";
import type { Technician } from "./technician-form-modal";
import { TechnicianFormModal } from "./technician-form-modal";
import { StatusBadge } from "@/src/components/ui/status-badge";

type CompanyOption = { id: string; name: string };

type TechniciansListProps = {
  technicians: Technician[];
  companies: CompanyOption[];
  error?: string | null;
};

function technicianDisplayName(t: Technician): string {
  return t.technician_name ?? t.name ?? "—";
}

function companyDisplay(t: Technician & { company_name?: string }): string {
  return t.company_name ?? "—";
}

export function TechniciansList({
  technicians: initialList,
  companies,
  error: initialError,
}: TechniciansListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete technician "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteTechnician(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Technician deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingTechnician(null);
    setModalOpen(true);
  };
  const openEdit = (t: Technician) => {
    setEditingTechnician(t);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingTechnician(null);
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
        <h2 className="text-lg font-medium text-[var(--foreground)]">Technicians</h2>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          New Technician
        </button>
      </div>

      {initialList.length === 0 ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">No technicians yet.</p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Add your first technician
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/70 text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Trade</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="w-24 px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialList.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[var(--card-border)] last:border-0 transition-colors hover:bg-[var(--background)]/50"
                  >
                    <td className="px-4 py-3.5 text-[var(--foreground)]">{technicianDisplayName(t)}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{companyDisplay(t as Technician & { company_name?: string })}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{t.trade ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id, technicianDisplayName(t))}
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

      <TechnicianFormModal
        open={modalOpen}
        onClose={closeModal}
        technician={editingTechnician}
        companies={companies}
        saveAction={saveTechnician}
      />
    </div>
  );
}
