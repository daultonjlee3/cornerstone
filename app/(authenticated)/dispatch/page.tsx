import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTenantIdForUser, getProductProfileForTenant } from "@/src/lib/auth-context";
import { resolveSearchParams, type SearchParams } from "@/src/lib/page-utils";
import { loadDispatchData } from "./dispatch-data";
import { loadFleetDispatchData } from "./fleet-dispatch-data";
import { parseFilterStateFromParams } from "./filter-state";
import { DispatchViewClient } from "./components/DispatchViewClient";
import { FleetDispatchViewClient } from "./components/FleetDispatchViewClient";
import { isFleetProductProfile } from "../nav-config";

export const metadata = {
  title: "Dispatch Intelligence | Cornerstone Fleet",
  description: "Fleet dispatch mission control — assignments, recommendations, and capacity",
};


export default async function DispatchPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const productProfile = await getProductProfileForTenant(tenantId, supabase);
  const params = await resolveSearchParams(searchParams);
  const filterState = parseFilterStateFromParams(params ?? {});

  if (isFleetProductProfile(productProfile)) {
    const branchId =
      typeof params?.branch_id === "string" ? params.branch_id.trim() || null : null;
    const fleetResult = await loadFleetDispatchData(
      supabase,
      tenantId,
      filterState.selectedDate,
      branchId
    );

    return (
      <FleetDispatchViewClient
        initialBoard={fleetResult.board}
        initialIntel={fleetResult.intel}
        selectedDate={filterState.selectedDate}
      />
    );
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);
  const companyIds = (companies ?? []).map((c) => (c as { id: string }).id);

  const result = await loadDispatchData({
    tenantId,
    companyIds,
    selectedDate: filterState.selectedDate,
    q: filterState.search || null,
    company_id: filterState.companyId || null,
    property_id: filterState.propertyId || null,
    building_id: filterState.buildingId || null,
    priority: filterState.priority || null,
    status: filterState.status || null,
    crew_id: filterState.crewId || null,
    technician_id: filterState.technicianId || null,
    assignment_type: filterState.assignmentType || null,
    asset_id: filterState.assetId || null,
    category: filterState.category || null,
    trace_work_order_id:
      typeof params?.trace_wo === "string" && params.trace_wo.trim()
        ? params.trace_wo.trim()
        : null,
  });

  return (
    <DispatchViewClient
      initialData={result}
      filterState={filterState}
    />
  );
}
