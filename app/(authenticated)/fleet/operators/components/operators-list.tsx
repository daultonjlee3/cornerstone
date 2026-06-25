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
import { EmptyState, KpiCard, SectionHeader, StatusChip } from "@/src/components/design-system";
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
  const activeCount = initialOperators.filter((operator) => operator.is_active).length;
  const inactiveCount = initialOperators.length - activeCount;

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
    <div className="space-y-5">
      {message && (
        <div
          className={`rounded-[var(--radius-lg)] border px-4 py-2 text-sm ${
            message.type === "error"
              ? "border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)] bg-[var(--status-danger-subtle)] text-[var(--status-danger)]"
              : "border-[color-mix(in_srgb,var(--status-success)_25%,transparent)] bg-[var(--status-success-subtle)] text-[var(--status-success)]"
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Visible operators" value={initialOperators.length} hint="Current page" />
        <KpiCard label="Active operators" value={activeCount} hint="Dispatch-ready" emphasis="success" />
        <KpiCard label="Inactive operators" value={inactiveCount} hint="Unavailable" emphasis={inactiveCount > 0 ? "warning" : "default"} />
        <KpiCard label="Branch coverage" value={branches.length} hint="Configured branches" />
      </div>

      <SectionHeader
        title="Operator roster"
        description="Drivers, operators, and role assignments for dispatch execution."
        action={
          <div className="flex items-center gap-2">
            <StatusChip label={`${branches.length} branches`} tone="neutral" showDot={false} />
            <Button type="button" onClick={openNew}>
              New Operator
            </Button>
          </div>
        }
      />

      {initialOperators.length === 0 ? (
        <EmptyState
          title="No operators yet"
          description="Add operators to improve recommendation quality and dispatch confidence."
          action={
            <Button type="button" onClick={openNew}>
              Add your first operator
            </Button>
          }
        />
      ) : (
        <DataTable className="shadow-[var(--elevation-1)]">
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
