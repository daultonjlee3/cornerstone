import { redirect } from "next/navigation";
import { resolveProcurementScope } from "@/src/lib/procurement/scope";
import { InventoryView } from "./components/inventory-view";
import type { StockLocationRecord } from "./components/stock-location-form-modal";

export const metadata = {
  title: "Inventory | Cornerstone Tech",
  description: "Location-based inventory balances",
};

export default async function InventoryPage() {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) redirect("/login");

  if (scope.companyIds.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Inventory</h1>
        <p className="text-sm text-[var(--muted)]">Create a company first to manage inventory.</p>
      </div>
    );
  }

  const [balancesResult, locationsResult, propertiesResult] = await Promise.all([
      scope.supabase
        .from("inventory_balances")
        .select(
          "id, product_id, stock_location_id, quantity_on_hand, minimum_stock, reorder_point, updated_at, products(id, company_id, name, sku, category, companies(name)), stock_locations(id, name, location_type, company_id)"
        )
        .order("updated_at", { ascending: false }),
      scope.supabase
        .from("stock_locations")
        .select("id, company_id, property_id, building_id, unit_id, name, location_type, active, is_default, companies(name)")
        .in("company_id", scope.companyIds)
        .order("name", { ascending: true }),
      scope.supabase
        .from("properties")
        .select("id, property_name, name, company_id")
        .in("company_id", scope.companyIds)
        .order("property_name", { ascending: true }),
    ]);
  const { data: transactionRowsRaw } = await scope.supabase
    .from("inventory_transactions")
    .select(
      "id, transaction_type, product_id, stock_location_id, quantity_change, reference_type, reference_id, unit_cost_snapshot, created_at, notes, products(name, sku), stock_locations(name)"
    )
    .in("company_id", scope.companyIds)
    .order("created_at", { ascending: false })
    .limit(120);

  const scopedPropertyIds = (propertiesResult.data ?? []).map((row) => (row as { id: string }).id);
  const { data: buildingsData } = scopedPropertyIds.length
    ? await scope.supabase
        .from("buildings")
        .select("id, building_name, name, property_id")
        .in("property_id", scopedPropertyIds)
        .order("building_name", { ascending: true })
    : { data: [] as unknown[] };
  const scopedBuildingIds = (buildingsData ?? []).map((row) => (row as { id: string }).id);
  const { data: unitsData } = scopedBuildingIds.length
    ? await scope.supabase
        .from("units")
        .select("id, unit_name, name_or_number, building_id")
        .in("building_id", scopedBuildingIds)
        .order("unit_name", { ascending: true })
    : { data: [] as unknown[] };

  const rows = (balancesResult.data ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const product = Array.isArray(record.products) ? record.products[0] : record.products;
      const location = Array.isArray(record.stock_locations)
        ? record.stock_locations[0]
        : record.stock_locations;
      const companyObj =
        product && typeof product === "object" && "companies" in (product as Record<string, unknown>)
          ? Array.isArray((product as Record<string, unknown>).companies)
            ? ((product as Record<string, unknown>).companies as unknown[])[0]
            : (product as Record<string, unknown>).companies
          : null;

      return {
        id: record.id as string,
        product_id: (record.product_id as string) ?? "",
        stock_location_id: (record.stock_location_id as string) ?? "",
        quantity_on_hand: Number(record.quantity_on_hand ?? 0),
        minimum_stock: (record.minimum_stock as number | null) ?? null,
        reorder_point: (record.reorder_point as number | null) ?? null,
        updated_at: (record.updated_at as string) ?? new Date().toISOString(),
        product_name:
          product && typeof product === "object" && "name" in (product as Record<string, unknown>)
            ? ((product as { name?: string }).name ?? "Product")
            : "Product",
        product_sku:
          product && typeof product === "object" && "sku" in (product as Record<string, unknown>)
            ? ((product as { sku?: string | null }).sku ?? null)
            : null,
        product_category:
          product && typeof product === "object" && "category" in (product as Record<string, unknown>)
            ? ((product as { category?: string | null }).category ?? null)
            : null,
        location_name:
          location && typeof location === "object" && "name" in (location as Record<string, unknown>)
            ? ((location as { name?: string }).name ?? "Location")
            : "Location",
        location_type:
          location && typeof location === "object" && "location_type" in (location as Record<string, unknown>)
            ? ((location as { location_type?: string | null }).location_type ?? null)
            : null,
        company_name:
          companyObj && typeof companyObj === "object" && "name" in (companyObj as Record<string, unknown>)
            ? ((companyObj as { name?: string }).name ?? "Company")
            : "Company",
      };
    })
    .filter((row) => row.product_id && row.stock_location_id);

  const locations = (locationsResult.data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const company = Array.isArray(record.companies) ? record.companies[0] : record.companies;
    return {
      id: record.id as string,
      company_id: record.company_id as string,
      property_id: (record.property_id as string | null) ?? null,
      building_id: (record.building_id as string | null) ?? null,
      unit_id: (record.unit_id as string | null) ?? null,
      name: (record.name as string) ?? "Location",
      location_type: (record.location_type as string) ?? "warehouse",
      active: Boolean(record.active),
      is_default: Boolean(record.is_default),
      company_name:
        company && typeof company === "object" && "name" in (company as Record<string, unknown>)
          ? ((company as { name?: string }).name ?? undefined)
          : undefined,
    } as StockLocationRecord;
  });

  const properties = (propertiesResult.data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name:
      (row as { property_name?: string | null }).property_name ??
      (row as { name?: string | null }).name ??
      "Property",
    company_id: (row as { company_id: string }).company_id,
  }));
  const buildings = (buildingsData ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name:
      (row as { building_name?: string | null }).building_name ??
      (row as { name?: string | null }).name ??
      "Building",
    property_id: (row as { property_id: string }).property_id,
  }));
  const units = (unitsData ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name:
      (row as { unit_name?: string | null }).unit_name ??
      (row as { name_or_number?: string | null }).name_or_number ??
      "Unit",
    building_id: (row as { building_id: string }).building_id,
  }));

  const transactionRows = (transactionRowsRaw ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const product = Array.isArray(record.products) ? record.products[0] : record.products;
    const location = Array.isArray(record.stock_locations)
      ? record.stock_locations[0]
      : record.stock_locations;
    return {
      id: (record.id as string) ?? "",
      transaction_type: (record.transaction_type as string | null) ?? null,
      product_id: (record.product_id as string | null) ?? null,
      stock_location_id: (record.stock_location_id as string | null) ?? null,
      quantity_change: Number(record.quantity_change ?? 0),
      reference_type: (record.reference_type as string | null) ?? null,
      reference_id: (record.reference_id as string | null) ?? null,
      unit_cost_snapshot: (record.unit_cost_snapshot as number | null) ?? null,
      created_at: (record.created_at as string) ?? new Date().toISOString(),
      notes: (record.notes as string | null) ?? null,
      product_name:
        product && typeof product === "object" && "name" in (product as Record<string, unknown>)
          ? ((product as { name?: string }).name ?? "Product")
          : "Product",
      product_sku:
        product && typeof product === "object" && "sku" in (product as Record<string, unknown>)
          ? ((product as { sku?: string | null }).sku ?? null)
          : null,
      stock_location_name:
        location && typeof location === "object" && "name" in (location as Record<string, unknown>)
          ? ((location as { name?: string }).name ?? "Location")
          : "Location",
    };
  });

  const poLineReferenceIds = transactionRows
    .filter((row) => row.reference_type === "purchase_order_line" && row.reference_id)
    .map((row) => row.reference_id as string);
  const woPartReferenceIds = transactionRows
    .filter((row) => row.reference_type === "work_order_part_usage" && row.reference_id)
    .map((row) => row.reference_id as string);
  const directWorkOrderReferenceIds = transactionRows
    .filter((row) => row.reference_type === "work_order" && row.reference_id)
    .map((row) => row.reference_id as string);

  const [{ data: poLines }, { data: woPartRows }, { data: workOrders }] = await Promise.all([
    poLineReferenceIds.length
      ? scope.supabase
          .from("purchase_order_lines")
          .select("id, purchase_order_id")
          .in("id", poLineReferenceIds)
      : { data: [] as unknown[] },
    woPartReferenceIds.length
      ? scope.supabase
          .from("work_order_part_usage")
          .select("id, work_order_id")
          .in("id", woPartReferenceIds)
      : { data: [] as unknown[] },
    directWorkOrderReferenceIds.length
      ? scope.supabase
          .from("work_orders")
          .select("id")
          .in("id", directWorkOrderReferenceIds)
      : { data: [] as unknown[] },
  ]);

  const poByLineId = new Map(
    (poLines ?? []).map((row) => [
      (row as { id: string }).id,
      (row as { purchase_order_id?: string | null }).purchase_order_id ?? null,
    ])
  );
  const workOrderByPartUsageId = new Map(
    (woPartRows ?? []).map((row) => [
      (row as { id: string }).id,
      (row as { work_order_id?: string | null }).work_order_id ?? null,
    ])
  );
  const directWorkOrderIdSet = new Set(
    (workOrders ?? []).map((row) => (row as { id: string }).id)
  );
  const transactions = transactionRows.map((row) => ({
    ...row,
    reference_po_id:
      row.reference_type === "purchase_order_line" && row.reference_id
        ? poByLineId.get(row.reference_id) ?? null
        : null,
    reference_work_order_id:
      row.reference_type === "work_order" && row.reference_id
        ? directWorkOrderIdSet.has(row.reference_id)
          ? row.reference_id
          : null
        : row.reference_type === "work_order_part_usage" && row.reference_id
        ? workOrderByPartUsageId.get(row.reference_id) ?? null
        : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">Inventory</h1>
        <p className="mt-1 text-[var(--muted)]">
          Location-level balances with low-stock alerts and audited adjustments.
        </p>
      </div>
      <InventoryView
        rows={rows}
        transactions={transactions}
        locations={locations}
        companies={scope.companies}
        properties={properties}
        buildings={buildings}
        units={units}
      />
    </div>
  );
}
