"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { deleteCompany } from "../actions";
import type { Company } from "./company-form-modal";
import { CompanyFormModal } from "./company-form-modal";
import { saveCompany } from "../actions";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/ui/status-badge";
import {
  DataTable,
  Table,
  TableHead,
  Th,
  TBody,
  Tr,
  Td,
} from "@/src/components/ui/data-table";

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
        <Button type="button" onClick={openNew}>
          New Company
        </Button>
      </div>

      {initialCompanies.length === 0 ? (
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">No companies yet.</p>
          <Button type="button" onClick={openNew} className="mt-4">
            Add your first company
          </Button>
        </div>
      ) : (
        <DataTable>
          <Table className="min-w-[600px]">
            <TableHead>
              <Th>Name</Th>
              <Th>Code</Th>
              <Th>Status</Th>
              <Th>Contact</Th>
              <Th className="w-24">Actions</Th>
            </TableHead>
            <TBody>
              {initialCompanies.map((c) => (
                <Tr key={c.id}>
                  <Td>{c.name}</Td>
                  <Td className="text-[var(--muted)]">{c.company_code ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={c.status} />
                  </Td>
                  <Td className="text-[var(--muted)]">
                    {c.primary_contact_name ?? c.primary_contact_email ?? "—"}
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={isPending}
                        className="rounded text-red-500 hover:underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </DataTable>
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
