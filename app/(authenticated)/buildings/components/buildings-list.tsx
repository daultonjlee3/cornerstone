"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { deleteBuilding } from "../actions";
import type { Building } from "./building-form-modal";
import { BuildingFormModal } from "./building-form-modal";
import { saveBuilding } from "../actions";
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

type PropertyOption = { id: string; name: string };

type BuildingsListProps = {
  buildings: Building[];
  properties: PropertyOption[];
  error?: string | null;
};

function buildingDisplayName(b: Building): string {
  return b.building_name ?? b.name ?? "—";
}

export function BuildingsList({
  buildings: initialBuildings,
  properties,
  error: initialError,
}: BuildingsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete building "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteBuilding(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Building deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingBuilding(null);
    setModalOpen(true);
  };
  const openEdit = (b: Building) => {
    setEditingBuilding(b);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingBuilding(null);
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
        <h2 className="text-lg font-medium text-[var(--foreground)]">Buildings</h2>
        <Button type="button" onClick={openNew}>
          New Building
        </Button>
      </div>

      {initialBuildings.length === 0 ? (
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">No buildings yet.</p>
          <Button type="button" onClick={openNew} className="mt-4">
            Add your first building
          </Button>
        </div>
      ) : (
        <DataTable>
          <Table className="min-w-[650px]">
            <TableHead>
              <Th>Building</Th>
              <Th>Property</Th>
              <Th>Status</Th>
              <Th className="w-32">Actions</Th>
            </TableHead>
            <TBody>
              {initialBuildings.map((b) => (
                <Tr key={b.id}>
                  <Td>{buildingDisplayName(b)}</Td>
                  <Td className="text-[var(--muted)]">
                    {b.property && "name" in b.property
                      ? b.property.name
                      : (b.property as { property_name?: string })?.property_name ?? "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={b.status} />
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/work-orders?new=1&company_id=${encodeURIComponent((b.property as { company_id?: string })?.company_id ?? "")}&property_id=${encodeURIComponent(b.property_id)}&building_id=${encodeURIComponent(b.id)}`}
                        className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      >
                        Create Work Order
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="rounded text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id, buildingDisplayName(b))}
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

      <BuildingFormModal
        open={modalOpen}
        onClose={closeModal}
        building={editingBuilding}
        properties={properties}
        saveAction={saveBuilding}
      />
    </div>
  );
}
