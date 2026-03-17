"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/src/components/ui/button";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { deletePurchaseOrderTemplate } from "../actions";

type TemplateRow = {
  id: string;
  company_id: string;
  vendor_id: string | null;
  name: string;
  notes: string | null;
  active: boolean;
  created_at: string;
  company_name?: string;
  vendor_name?: string;
  line_count: number;
};

type PurchaseOrderTemplatesListProps = {
  templates: TemplateRow[];
  companies: { id: string; name: string }[];
  vendors: { id: string; name: string; company_id: string }[];
};

export function PurchaseOrderTemplatesList({
  templates,
}: PurchaseOrderTemplatesListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onDelete = (row: TemplateRow) => {
    if (!confirm(`Delete template "${row.name}"?`)) return;
    startTransition(async () => {
      const result = await deletePurchaseOrderTemplate(row.id);
      if (result.error) alert(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/purchase-orders/templates/new">New template</Link>
        </Button>
      </div>
      <DataTable>
        <Table className="min-w-[640px]">
          <TableHead>
            <Th>Name</Th>
            <Th>Company</Th>
            <Th>Vendor</Th>
            <Th className="text-right">Lines</Th>
            <Th className="w-48">Actions</Th>
          </TableHead>
          <TBody>
            {templates.length === 0 ? (
              <Tr>
                <td className="px-4 py-3.5 text-center text-[var(--muted)]" colSpan={5}>
                  No templates yet. Create one from scratch or from an existing PO.
                </td>
              </Tr>
            ) : null}
            {templates.map((row) => (
              <Tr key={row.id}>
                <Td className="font-medium text-[var(--foreground)]">{row.name}</Td>
                <Td>{row.company_name ?? "—"}</Td>
                <Td>{row.vendor_name ?? "—"}</Td>
                <Td className="text-right">{row.line_count}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/purchase-orders?useTemplate=${row.id}`}>Use template</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onDelete(row)}
                      disabled={isPending}
                      className="text-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </DataTable>
    </div>
  );
}
