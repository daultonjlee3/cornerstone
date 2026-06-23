"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useCallback } from "react";
import { deleteFleetOperator, saveFleetOperator } from "../../actions";
import type { FleetOperator } from "./operator-form-modal";
import { OperatorFormModal } from "./operator-form-modal";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { ActionsDropdown } from "@/src/components/ui/actions-dropdown";
import { Pagination } from "@/src/components/ui/pagination";
import {
  DataTable,
  Table,
  TableHead,
  Th,
  TBody,
  Tr,
  Td,
} from "@/src/components/ui/data-table";

type OperatorRow = FleetOperator & { branch_name?: string | null };

type OperatorsListProps = {
  operators: OperatorRow[];
  branches: { id: string; name: string }[];
  error?: string | null;
  totalCount?: number;
  page?: number;
  pageSize?: number;
};

function buildParams(searchParams: URLSearchParams, updates: Record<string, string>): string {
  const next = new URLSearchParams(searchParams.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (value === "" || value == null) next.delete(key);
    else next.set(key, value);
  });
  return next.toString();
}

export function OperatorsList({
  operators: initialOperators,
  branches,
  error: initialError,
  totalCount: totalCountProp,
  page: pageProp = 1,
  pageSize: pageSizeProp = 25,
}: OperatorsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const applyParams = useCallback(
    (updates: Record<string, string>) => {
      const query = buildParams(searchParams, updates);
      startTransition(() => {
        router.push(`/fleet/operators${query ? `?${query}` : ""}`);
      });
    },
    [router, searchParams]
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<FleetOperator | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete operator "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteFleetOperator(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Operator deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingOperator(null);
    setModalOpen(true);
  };
  const openEdit = (o: FleetOperator) => {
    setEditingOperator(o);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingOperator(null);
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
        <h2 className="text-lg font-medium text-[var(--foreground)]">Operators</h2>
        <Button type="button" onClick={openNew}>
          New Operator
        </Button>
      </div>

      {initialOperators.length === 0 ? (
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">No operators yet.</p>
          <Button type="button" onClick={openNew} className="mt-4">
            Add your first operator
          </Button>
        </div>
      ) : (
        <DataTable>
          <Table className="min-w-[600px]">
            <TableHead>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Branch</Th>
              <Th>Status</Th>
              <Th className="w-24">Actions</Th>
            </TableHead>
            <TBody>
              {initialOperators.map((o) => (
                <Tr key={o.id}>
                  <Td>{o.name}</Td>
                  <Td className="text-[var(--muted)] capitalize">{o.operator_role}</Td>
                  <Td className="text-[var(--muted)]">{o.branch_name ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={o.is_active ? "active" : "inactive"} />
                  </Td>
                  <Td>
                    <ActionsDropdown
                      align="right"
                      items={[
                        { type: "button", label: "Edit", onClick: () => openEdit(o) },
                        {
                          type: "button",
                          label: "Delete",
                          onClick: () => handleDelete(o.id, o.name),
                          disabled: isPending,
                          destructive: true,
                        },
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          {totalCountProp != null && (
            <Pagination
              page={pageProp}
              pageSize={pageSizeProp}
              totalCount={totalCountProp}
              onPageChange={(p) => applyParams({ page: String(p) })}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageSizeChange={(size) => applyParams({ page_size: String(size), page: "1" })}
            />
          )}
        </DataTable>
      )}

      <OperatorFormModal
        open={modalOpen}
        onClose={closeModal}
        operator={editingOperator}
        branches={branches}
        saveAction={saveFleetOperator}
      />
    </div>
  );
}
