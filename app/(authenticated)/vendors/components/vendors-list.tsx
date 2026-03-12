"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { deleteVendor, saveVendor } from "../actions";
import { VendorFormModal, type VendorRecord } from "./vendor-form-modal";

type CompanyOption = { id: string; name: string };

type VendorsListProps = {
  vendors: VendorRecord[];
  companies: CompanyOption[];
};

const PAGE_SIZE = 12;

function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const normalized = Math.max(0, Math.round(minutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function formatCurrency(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function VendorsList({ vendors, companies }: VendorsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "company" | "updated">("name");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VendorRecord | null>(null);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const base = lower
      ? vendors.filter((vendor) => {
          const haystack = [
            vendor.name,
            vendor.contact_name ?? "",
            vendor.email ?? "",
            vendor.phone ?? "",
            vendor.company_name ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(lower);
        })
      : vendors.slice();

    base.sort((a, b) => {
      if (sort === "company") return (a.company_name ?? "").localeCompare(b.company_name ?? "") || a.name.localeCompare(b.name);
      if (sort === "updated") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return a.name.localeCompare(b.name);
    });
    return base;
  }, [query, sort, vendors]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (vendor: VendorRecord) => {
    setEditing(vendor);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    router.refresh();
  };

  const onDelete = (vendor: VendorRecord) => {
    if (!confirm(`Delete vendor "${vendor.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteVendor(vendor.id);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Vendor deleted." });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-[260px] flex-1 flex-wrap items-end gap-2">
          <label className="w-full max-w-sm">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Search</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by vendor, contact, email, phone"
              className="ui-input"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as "name" | "company" | "updated")}
              className="ui-select"
            >
              <option value="name">Name</option>
              <option value="company">Company</option>
              <option value="updated">Recently updated</option>
            </select>
          </label>
        </div>
        <Button onClick={openNew}>New Vendor</Button>
      </div>

      <DataTable>
        <Table className="min-w-[1120px]">
          <TableHead>
            <Th>Vendor</Th>
            <Th>Company</Th>
            <Th>Service Type</Th>
            <Th>Contact</Th>
            <Th>Jobs Completed</Th>
            <Th>Avg Response</Th>
            <Th>Total Vendor Cost</Th>
            <Th>Preferred</Th>
            <Th>Updated</Th>
            <Th className="w-32">Actions</Th>
          </TableHead>
          <TBody>
            {pageRows.length === 0 ? (
              <Tr>
                <td className="px-4 py-3.5 text-center text-[var(--muted)]" colSpan={10}>
                  No vendors found.
                </td>
              </Tr>
            ) : null}
            {pageRows.map((vendor) => (
              <Tr key={vendor.id}>
                <Td>
                  <Link href={`/vendors/${vendor.id}`} className="font-medium text-[var(--accent)] hover:underline">
                    {vendor.name}
                  </Link>
                  {vendor.website ? (
                    <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{vendor.website}</p>
                  ) : null}
                </Td>
                <Td>{vendor.company_name ?? "—"}</Td>
                <Td>{vendor.service_type ?? "—"}</Td>
                <Td className="text-[var(--muted)]">{vendor.contact_name ?? vendor.email ?? vendor.phone ?? "—"}</Td>
                <Td>{vendor.jobs_completed ?? 0}</Td>
                <Td>{formatMinutes(vendor.average_response_time_minutes)}</Td>
                <Td>{formatCurrency(vendor.total_vendor_cost)}</Td>
                <Td>
                  {vendor.preferred_vendor ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Preferred
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="text-[var(--muted)]">{new Date(vendor.updated_at).toLocaleDateString()}</Td>
                <Td>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(vendor)}
                      className="text-[var(--accent)] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onDelete(vendor)}
                      className="text-red-600 hover:underline disabled:opacity-60"
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

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">
          Showing {(currentPage - 1) * PAGE_SIZE + (pageRows.length ? 1 : 0)}-
          {(currentPage - 1) * PAGE_SIZE + pageRows.length} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-[var(--muted)]">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <VendorFormModal
        open={modalOpen}
        onClose={closeModal}
        vendor={editing}
        companies={companies}
        saveAction={saveVendor}
      />
    </div>
  );
}
