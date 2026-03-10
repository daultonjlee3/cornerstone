"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { deleteUnit } from "../actions";
import type { Unit } from "./unit-form-modal";
import { UnitFormModal } from "./unit-form-modal";
import { saveUnit } from "../actions";
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

type BuildingOption = { id: string; name: string };

type UnitsListProps = {
  units: Unit[];
  buildings: BuildingOption[];
  error?: string | null;
};

function unitDisplayName(u: Unit): string {
  return u.unit_name ?? u.name_or_number ?? "—";
}

function buildingDisplayName(u: Unit): string {
  const b = u.building;
  if (!b) return "—";
  return (b as { building_name?: string }).building_name ?? (b as { name?: string }).name ?? "—";
}

export function UnitsList({
  units: initialUnits,
  buildings,
  error: initialError,
}: UnitsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete unit "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteUnit(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Unit deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingUnit(null);
    setModalOpen(true);
  };
  const openEdit = (u: Unit) => {
    setEditingUnit(u);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingUnit(null);
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
        <h2 className="text-lg font-medium text-[var(--foreground)]">Units</h2>
        <Button type="button" onClick={openNew}>
          New Unit
        </Button>
      </div>

      {initialUnits.length === 0 ? (
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">No units yet.</p>
          <Button type="button" onClick={openNew} className="mt-4">
            Add your first unit
          </Button>
        </div>
      ) : (
        <DataTable>
          <Table className="min-w-[700px]">
            <TableHead>
              <Th>Unit</Th>
              <Th>Building</Th>
              <Th>Floor</Th>
              <Th>Status</Th>
              <Th className="w-32">Actions</Th>
            </TableHead>
            <TBody>
              {initialUnits.map((u) => (
                <Tr key={u.id}>
                  <Td>{unitDisplayName(u)}</Td>
                  <Td className="text-[var(--muted)]">{buildingDisplayName(u)}</Td>
                  <Td className="text-[var(--muted)]">{u.floor ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={u.status} />
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/work-orders?new=1&company_id=${encodeURIComponent((u.building as { company_id?: string })?.company_id ?? "")}&property_id=${encodeURIComponent((u.building as { property_id?: string })?.property_id ?? "")}&building_id=${encodeURIComponent(u.building_id)}&unit_id=${encodeURIComponent(u.id)}`}
                        className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      >
                        Create Work Order
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id, unitDisplayName(u))}
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

      <UnitFormModal
        open={modalOpen}
        onClose={closeModal}
        unit={editingUnit}
        buildings={buildings}
        saveAction={saveUnit}
      />
    </div>
  );
}
