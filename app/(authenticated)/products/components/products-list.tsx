"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { ActionsDropdown } from "@/src/components/ui/actions-dropdown";
import { deleteProduct, saveProduct } from "../actions";
import { ProductFormModal, type ProductRecord } from "./product-form-modal";

type CompanyOption = { id: string; name: string };
type VendorOption = { id: string; name: string; company_id: string };

type ProductsListProps = {
  products: ProductRecord[];
  companies: CompanyOption[];
  vendors: VendorOption[];
};

const PAGE_SIZE = 12;

export function ProductsList({ products, companies, vendors }: ProductsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<"name" | "category" | "updated">("name");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRecord | null>(null);

  const categories = useMemo(() => {
    const values = new Set<string>();
    products.forEach((product) => {
      if (product.category) values.add(product.category);
    });
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const rows = products.filter((product) => {
      if (category !== "all" && (product.category ?? "uncategorized") !== category) return false;
      if (activeFilter === "active" && !product.active) return false;
      if (activeFilter === "inactive" && product.active) return false;
      if (!lower) return true;
      return (
        `${product.name} ${product.sku ?? ""} ${product.category ?? ""} ${product.default_vendor_name ?? ""}`
          .toLowerCase()
          .includes(lower)
      );
    });

    rows.sort((a, b) => {
      if (sort === "updated") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sort === "category") return (a.category ?? "").localeCompare(b.category ?? "") || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [activeFilter, category, products, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (product: ProductRecord) => {
    setEditing(product);
    setModalOpen(true);
  };

  const handleDelete = (product: ProductRecord) => {
    if (!confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Product deleted." });
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
        <div className="flex flex-1 flex-wrap items-end gap-2">
          <label className="w-full max-w-sm">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Search</span>
            <input
              className="ui-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, SKU, vendor"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Category</span>
            <select
              className="ui-select"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Status</span>
            <select
              className="ui-select"
              value={activeFilter}
              onChange={(event) => {
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Sort</span>
            <select className="ui-select" value={sort} onChange={(event) => setSort(event.target.value as "name" | "category" | "updated")}>
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="updated">Recently updated</option>
            </select>
          </label>
        </div>
        <Button onClick={openNew}>New Product</Button>
      </div>

      <DataTable>
        <Table className="min-w-[1000px]">
          <TableHead>
            <Th>Product</Th>
            <Th>Company</Th>
            <Th>Category</Th>
            <Th>Default Vendor</Th>
            <Th className="text-right">Default Cost</Th>
            <Th className="text-right">Reorder Point</Th>
            <Th>Status</Th>
            <Th className="w-32">Actions</Th>
          </TableHead>
          <TBody>
            {pageRows.length === 0 ? (
              <Tr>
                <td className="px-4 py-3.5 text-center text-[var(--muted)]" colSpan={8}>
                  No products found.
                </td>
              </Tr>
            ) : null}
            {pageRows.map((product) => (
              <Tr key={product.id}>
                <Td>
                  <Link href={`/products/${product.id}`} className="font-medium text-[var(--accent)] hover:underline">
                    {product.name}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">{product.sku ?? "No SKU"}</p>
                </Td>
                <Td>{product.company_name ?? "—"}</Td>
                <Td>{product.category ?? "Uncategorized"}</Td>
                <Td>{product.default_vendor_name ?? "—"}</Td>
                <Td className="text-right">
                  {product.default_cost != null ? `$${Number(product.default_cost).toFixed(2)}` : "—"}
                </Td>
                <Td className="text-right">{product.reorder_point_default ?? "—"}</Td>
                <Td>
                  {product.active ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-300/30 px-2 py-0.5 text-xs font-medium text-slate-700">
                      Inactive
                    </span>
                  )}
                </Td>
                <Td>
                  <ActionsDropdown
                    align="right"
                    items={[
                      { type: "link", label: "View", href: `/products/${product.id}` },
                      { type: "button", label: "Edit", onClick: () => openEdit(product) },
                      { type: "button", label: "Delete", onClick: () => handleDelete(product), disabled: isPending, destructive: true },
                    ]}
                  />
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
          <Button size="sm" variant="secondary" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-[var(--muted)]">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <ProductFormModal
        key={`${editing?.id ?? "new"}-${modalOpen ? "open" : "closed"}`}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          router.refresh();
        }}
        product={editing}
        companies={companies}
        vendors={vendors}
        saveAction={saveProduct}
      />
    </div>
  );
}
