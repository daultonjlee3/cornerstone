import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import {
  loadFleetUtilizationReport,
  utilizationReportToCsvRows,
} from "@/src/lib/fleet/queries/utilization-report";

function escapeCsvCell(value: string | number | null | undefined): string {
  const normalized = value == null ? "" : String(value);
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildCsv(
  columns: { key: string; label: string }[],
  rows: Record<string, string | number | null>[]
): string {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(row[column.key] ?? "")).join(",")
  );
  return [header, ...body].join("\n");
}

export async function GET(request: Request) {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await can("fleet.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from")?.trim() || undefined;
  const to = url.searchParams.get("to")?.trim() || undefined;
  const branchId = url.searchParams.get("branch_id")?.trim() || null;
  const truckId = url.searchParams.get("truck_id")?.trim() || null;

  const data = await loadFleetUtilizationReport(supabase, auth.tenantId, {
    from,
    to,
    branchId,
    truckId,
  });

  const { columns, rows } = utilizationReportToCsvRows(data);
  const csv = buildCsv(columns, rows);
  const filename = `fleet-utilization-${data.from}-to-${data.to}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
