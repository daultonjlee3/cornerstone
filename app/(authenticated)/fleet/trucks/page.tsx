import { Truck } from "lucide-react";
import { TrucksList } from "./components/trucks-list";
import { PageHeader } from "@/src/components/ui/page-header";
import { computeTelematicsStatus, listTruckLatestPositions } from "@/src/lib/fleet/queries";
import { resolveSearchParams, type SearchParams } from "@/src/lib/page-utils";
import { requireFleetModuleAccess } from "../_lib/access";

export const metadata = {
  title: "Trucks | Cornerstone Tech",
  description: "Manage fleet trucks",
};

export default async function TrucksPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const { supabase, auth } = await requireFleetModuleAccess();
  const tenantId = auth.tenantId;

  const params = await resolveSearchParams(searchParams);
  const page = Math.max(1, parseInt(typeof params?.page === "string" ? params.page : "", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(typeof params?.page_size === "string" ? params.page_size : "", 10) || 25)
  );

  const [{ data: trucks, error, count }, { data: branches }, positions] = await Promise.all([
    supabase
      .from("trucks")
      .select(
        "id, branch_id, unit_number, truck_type, capacity, status, telematics_device_id, home_latitude, home_longitude, notes, last_telematics_at, branches(name)",
        { count: "exact" }
      )
      .eq("tenant_id", tenantId)
      .order("unit_number")
      .range((page - 1) * pageSize, page * pageSize - 1),
    supabase.from("branches").select("id, name").eq("tenant_id", tenantId).order("name"),
    listTruckLatestPositions(supabase, tenantId),
  ]);

  const positionByTruck = new Map(positions.map((p) => [p.truck_id, p]));

  const truckRows = (trucks ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const branchesRaw = record.branches;
    const branchRecord = Array.isArray(branchesRaw)
      ? (branchesRaw[0] as { name?: string } | undefined)
      : (branchesRaw as { name?: string } | null);
    const capacity = record.capacity as { gallons?: number } | null;
    const lastTelematicsAt =
      record.last_telematics_at == null ? null : String(record.last_telematics_at);
    const latest = positionByTruck.get(String(record.id));
    return {
      id: String(record.id),
      branch_id: String(record.branch_id),
      unit_number: String(record.unit_number),
      truck_type: String(record.truck_type),
      capacity_gallons: capacity?.gallons ?? null,
      status: String(record.status ?? "active"),
      telematics_device_id:
        record.telematics_device_id == null ? null : String(record.telematics_device_id),
      home_latitude: record.home_latitude == null ? null : Number(record.home_latitude),
      home_longitude: record.home_longitude == null ? null : Number(record.home_longitude),
      notes: record.notes == null ? null : String(record.notes),
      branch_name: branchRecord?.name ?? null,
      last_telematics_at: lastTelematicsAt,
      telematics_status: computeTelematicsStatus(lastTelematicsAt),
      latest_latitude: latest?.latitude ?? null,
      latest_longitude: latest?.longitude ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Truck className="size-5" />}
        title="Trucks"
        subtitle="Manage fleet vehicles and unit assignments."
        variant="surface"
      />
      <TrucksList
        trucks={truckRows}
        branches={(branches ?? []) as { id: string; name: string }[]}
        error={error?.message ?? null}
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
