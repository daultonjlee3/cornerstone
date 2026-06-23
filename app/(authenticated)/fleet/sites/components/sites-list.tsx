"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useCallback } from "react";
import { deleteCustomerSite, saveCustomerSite } from "../../actions";
import type { CustomerSite } from "./site-form-modal";
import { SiteFormModal } from "./site-form-modal";
import { Button } from "@/src/components/ui/button";
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

type SiteRow = CustomerSite & { company_name?: string | null };

type SitesListProps = {
  sites: SiteRow[];
  companies: { id: string; name: string }[];
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

export function SitesList({
  sites: initialSites,
  companies,
  error: initialError,
  totalCount: totalCountProp,
  page: pageProp = 1,
  pageSize: pageSizeProp = 25,
}: SitesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const applyParams = useCallback(
    (updates: Record<string, string>) => {
      const query = buildParams(searchParams, updates);
      startTransition(() => {
        router.push(`/fleet/sites${query ? `?${query}` : ""}`);
      });
    },
    [router, searchParams]
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<CustomerSite | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete site "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteCustomerSite(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Site deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingSite(null);
    setModalOpen(true);
  };
  const openEdit = (s: CustomerSite) => {
    setEditingSite(s);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingSite(null);
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
        <h2 className="text-lg font-medium text-[var(--foreground)]">Customer Sites</h2>
        <Button type="button" onClick={openNew}>
          New Site
        </Button>
      </div>

      {initialSites.length === 0 ? (
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">No customer sites yet.</p>
          <Button type="button" onClick={openNew} className="mt-4">
            Add your first site
          </Button>
        </div>
      ) : (
        <DataTable>
          <Table className="min-w-[600px]">
            <TableHead>
              <Th>Name</Th>
              <Th>Company</Th>
              <Th>Location</Th>
              <Th>Coordinates</Th>
              <Th className="w-24">Actions</Th>
            </TableHead>
            <TBody>
              {initialSites.map((s) => (
                <Tr key={s.id}>
                  <Td>{s.name}</Td>
                  <Td className="text-[var(--muted)]">{s.company_name ?? "—"}</Td>
                  <Td className="text-[var(--muted)]">
                    {[s.city, s.state].filter(Boolean).join(", ") || s.address_line1 || "—"}
                  </Td>
                  <Td className="text-[var(--muted)] text-xs">
                    {s.latitude != null && s.longitude != null
                      ? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`
                      : "—"}
                  </Td>
                  <Td>
                    <ActionsDropdown
                      align="right"
                      items={[
                        { type: "button", label: "Edit", onClick: () => openEdit(s) },
                        {
                          type: "button",
                          label: "Delete",
                          onClick: () => handleDelete(s.id, s.name),
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

      <SiteFormModal
        open={modalOpen}
        onClose={closeModal}
        site={editingSite}
        companies={companies}
        saveAction={saveCustomerSite}
      />
    </div>
  );
}
