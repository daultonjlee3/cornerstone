"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import Link from "next/link";
import { deleteTechnician, saveTechnician } from "../actions";
import type { Technician } from "./technician-form-modal";
import { TechnicianFormModal } from "./technician-form-modal";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { Button } from "@/src/components/ui/button";
import { ActionsDropdown } from "@/src/components/ui/actions-dropdown";
import {
  DataTable,
  Table,
  TableHead,
  Th,
  TBody,
  Tr,
  Td,
  TableEmptyState,
} from "@/src/components/ui/data-table";

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
        <Button type="button" onClick={openNew}>
          New Technician
        </Button>
      </div>

      {initialList.length === 0 ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">No technicians yet.</p>
          <Button type="button" onClick={openNew} className="mt-4">
            Add your first technician
          </Button>
        </div>
      ) : (
        <DataTable>
          <Table className="min-w-[640px]">
            <TableHead>
              <Th>Name</Th>
              <Th>Company</Th>
              <Th>Trade</Th>
              <Th>Status</Th>
              <Th className="w-24">Actions</Th>
            </TableHead>
            <TBody>
              {initialList.length === 0 ? (
                <TableEmptyState colSpan={5} message="No technicians yet." />
              ) : null}
              {initialList.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <Link href={`/technicians/${t.id}`} className="text-[var(--accent)] hover:underline">
                      {technicianDisplayName(t)}
                    </Link>
                  </Td>
                  <Td className="text-[var(--muted)]">
                    {companyDisplay(t as Technician & { company_name?: string })}
                  </Td>
                  <Td className="text-[var(--muted)]">{t.trade ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={t.status} />
                  </Td>
                  <Td>
                    <ActionsDropdown
                      align="right"
                      items={[
                        { type: "link", label: "View", href: `/technicians/${t.id}` },
                        { type: "button", label: "Edit", onClick: () => openEdit(t) },
                        { type: "button", label: "Delete", onClick: () => handleDelete(t.id, technicianDisplayName(t)), disabled: isPending, destructive: true },
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </DataTable>
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
