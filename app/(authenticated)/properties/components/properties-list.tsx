"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useCallback } from "react";
import { deleteProperty } from "../actions";
import type { Property } from "./property-form-modal";
import { PropertyFormModal } from "./property-form-modal";
import { saveProperty } from "../actions";
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

type CompanyOption = { id: string; name: string };

type PropertiesListProps = {
  properties: Property[];
  companies: CompanyOption[];
  error?: string | null;
  mapboxToken?: string | null;
  totalCount?: number;
  page?: number;
  pageSize?: number;
};

function propertyDisplayName(p: Property): string {
  return p.property_name ?? (p as { name?: string }).name ?? "—";
}

function buildParams(searchParams: URLSearchParams, updates: Record<string, string>): string {
  const next = new URLSearchParams(searchParams.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (value === "" || value == null) next.delete(key);
    else next.set(key, value);
  });
  return next.toString();
}

export function PropertiesList({
  properties: initialProperties,
  companies,
  error: initialError,
  mapboxToken,
  totalCount: totalCountProp,
  page: pageProp = 1,
  pageSize: pageSizeProp = 25,
}: PropertiesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const applyParams = useCallback(
    (updates: Record<string, string>) => {
      const query = buildParams(searchParams, updates);
      startTransition(() => router.push(`/properties${query ? `?${query}` : ""}`));
    },
    [router, searchParams]
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete property "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteProperty(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Property deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingProperty(null);
    setModalOpen(true);
  };
  const openEdit = (p: Property) => {
    setEditingProperty(p);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingProperty(null);
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
        <h2 className="text-lg font-medium text-[var(--foreground)]">Properties</h2>
        <Button type="button" onClick={openNew}>
          New Property
        </Button>
      </div>

      {initialProperties.length === 0 ? (
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">No properties yet.</p>
          <Button type="button" onClick={openNew} className="mt-4">
            Add your first property
          </Button>
        </div>
      ) : (
        <DataTable>
          <Table className="min-w-[700px]">
            <TableHead>
              <Th>Property</Th>
              <Th>Company</Th>
              <Th>Address</Th>
              <Th>Status</Th>
              <Th className="w-32">Actions</Th>
            </TableHead>
            <TBody>
              {initialProperties.map((p) => (
                <Tr key={p.id}>
                  <Td>{propertyDisplayName(p)}</Td>
                  <Td className="text-[var(--muted)]">{p.company?.name ?? "—"}</Td>
                  <Td className="text-[var(--muted)]">
                    {[p.address_line1, p.city, p.state].filter(Boolean).join(", ") || "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td>
                    <ActionsDropdown
                      align="right"
                      items={[
                        { type: "link", label: "Create Work Order", href: `/work-orders?new=1&company_id=${encodeURIComponent(p.company_id)}&property_id=${encodeURIComponent(p.id)}` },
                        { type: "button", label: "Edit", onClick: () => openEdit(p) },
                        { type: "button", label: "Delete", onClick: () => handleDelete(p.id, propertyDisplayName(p)), disabled: isPending, destructive: true },
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

      <PropertyFormModal
        open={modalOpen}
        onClose={closeModal}
        property={editingProperty}
        companies={companies}
        saveAction={saveProperty}
        mapboxToken={mapboxToken}
      />
    </div>
  );
}
