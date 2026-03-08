"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { deleteCompany } from "../actions";
import type { Company } from "./company-form-modal";
import { CompanyFormModal } from "./company-form-modal";
import { saveCompany } from "../actions";

type CompaniesListProps = {
  companies: Company[];
  error?: string | null;
};

export function CompaniesList({ companies: initialCompanies, error: initialError }: CompaniesListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete company "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteCompany(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Company deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingCompany(null);
    setModalOpen(true);
  };
  const openEdit = (c: Company) => {
    setEditingCompany(c);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingCompany(null);
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
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-lg font-medium text-[var(--foreground)]">Companies</h2>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          New Company
        </button>
      </div>

      {initialCompanies.length === 0 ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">No companies yet.</p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Add your first company
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Name</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Code</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Status</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Contact</th>
                  <th className="w-24 px-4 py-3 font-medium text-[var(--foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialCompanies.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--background)]/50"
                  >
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.name}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{c.company_code ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === "active"
                            ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                            : "bg-[var(--muted)]/20 text-[var(--muted)]"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {c.primary_contact_name ?? c.primary_contact_email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={isPending}
                          className="text-red-500 hover:underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
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

      <CompanyFormModal
        open={modalOpen}
        onClose={closeModal}
        company={editingCompany}
        saveAction={saveCompany}
      />
    </div>
  );
}
