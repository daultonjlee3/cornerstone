import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createClient } from "@/src/lib/supabase/server";
import {
  getReportDataset,
  loadOperationsIntelligenceData,
  type OperationsReportType,
} from "@/src/lib/dashboard/operations-intelligence";

const VALID_REPORT_TYPES: OperationsReportType[] = [
  "maintenance_cost_by_asset",
  "maintenance_cost_by_building",
  "work_orders_by_technician",
  "work_orders_by_property",
  "asset_failure_rate",
];

function parseReportType(value: string | null): OperationsReportType | null {
  if (!value) return null;
  return VALID_REPORT_TYPES.includes(value as OperationsReportType)
    ? (value as OperationsReportType)
    : null;
}

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

async function buildPdf(
  title: string,
  columns: { key: string; label: string }[],
  rows: Record<string, string | number | null>[]
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const pageSize: [number, number] = [842, 595];
  const margin = 32;
  const lineHeight = 13;
  const maxChars = 150;
  const regularFont = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);

  let page = document.addPage(pageSize);
  let y = page.getHeight() - margin;

  const writeLine = (text: string, bold = false, fontSize = 10) => {
    page.drawText(text.slice(0, maxChars), {
      x: margin,
      y,
      size: fontSize,
      font: bold ? boldFont : regularFont,
    });
    y -= lineHeight;
  };

  const ensureSpace = (lines = 1) => {
    if (y - lines * lineHeight > margin) return;
    page = document.addPage(pageSize);
    y = page.getHeight() - margin;
    writeLine(title, true, 13);
    writeLine("", false, 10);
    writeLine(columns.map((column) => column.label).join(" | "), true, 9);
  };

  writeLine(title, true, 13);
  writeLine("", false, 10);
  writeLine(columns.map((column) => column.label).join(" | "), true, 9);

  for (const row of rows) {
    const text = columns
      .map((column) => `${column.label}: ${row[column.key] == null ? "" : String(row[column.key])}`)
      .join(" | ");
    const chunks = text.length > maxChars ? Math.ceil(text.length / maxChars) : 1;
    ensureSpace(chunks);
    for (let index = 0; index < chunks; index += 1) {
      const segment = text.slice(index * maxChars, (index + 1) * maxChars);
      writeLine(segment, false, 9);
    }
  }

  return document.save();
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "No tenant membership found." }, { status: 403 });
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", membership.tenant_id);
  const companyIds = (companies ?? []).map((row) => row.id);
  if (companyIds.length === 0) {
    return NextResponse.json({ error: "No company scope available." }, { status: 400 });
  }

  const url = new URL(request.url);
  const type = parseReportType(url.searchParams.get("type"));
  if (!type) {
    return NextResponse.json({ error: "Invalid report type." }, { status: 400 });
  }

  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (format !== "csv" && format !== "pdf") {
    return NextResponse.json({ error: "Invalid format. Use csv or pdf." }, { status: 400 });
  }

  const intelligence = await loadOperationsIntelligenceData({
    supabase,
    companyIds,
    startDate: url.searchParams.get("start_date"),
    endDate: url.searchParams.get("end_date"),
  });
  const dataset = getReportDataset(intelligence, type);
  const stampedName = `${type}_${new Date().toISOString().slice(0, 10)}`;

  if (format === "csv") {
    const csv = buildCsv(dataset.columns, dataset.rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${stampedName}.csv"`,
      },
    });
  }

  const pdfBytes = await buildPdf(dataset.title, dataset.columns, dataset.rows);
  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${stampedName}.pdf"`,
    },
  });
}
