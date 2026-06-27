import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTenantIdForUser, getProductProfileForTenant } from "@/src/lib/auth-context";
import { resolveSearchParams, type SearchParams } from "@/src/lib/page-utils";
import { loadDispatchData } from "./dispatch-data";
import { loadFleetDispatchCriticalData } from "./fleet-dispatch-data";
import { parseFilterStateFromParams, parseDateSafe } from "./filter-state";
import { DispatchViewClient } from "./components/DispatchViewClient";
import { FleetDispatchViewClient } from "./components/FleetDispatchViewClient";
import { isFleetProductProfile } from "../nav-config";
import { createDispatchPerfTimer } from "@/src/lib/fleet/dispatch/perf";
import { ensurePeachtreeDemoTelematicsFresh } from "@/src/lib/fleet/demo/peachtree-demo-telematics";

export const metadata = {
  title: "Dispatch Intelligence | Cornerstone Fleet",
  description: "Fleet dispatch mission control — assignments, recommendations, and capacity",
};

function peachtreeDemoBoardDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const perf = createDispatchPerfTimer("dispatch-page");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  perf.stage("auth");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");
  perf.stage("tenant");

  const productProfile = await getProductProfileForTenant(tenantId, supabase);
  const params = await resolveSearchParams(searchParams);
  perf.stage("context");

  const filterState = parseFilterStateFromParams(params ?? {});
  let selectedDate = filterState.selectedDate;

  if (isFleetProductProfile(productProfile)) {
    const dateParam = typeof params?.date === "string" ? params.date.trim() : "";
    const hasDateParam = parseDateSafe(dateParam) != null;

    const { data: tenant } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", tenantId)
      .maybeSingle();

    if (!hasDateParam && tenant?.slug === "peachtree-industrial") {
      selectedDate = peachtreeDemoBoardDate();
    }

    if (tenant?.slug === "peachtree-industrial") {
      await ensurePeachtreeDemoTelematicsFresh(supabase, tenantId);
    }

    const branchId =
      typeof params?.branch_id === "string" ? params.branch_id.trim() || null : null;
    const { board } = await loadFleetDispatchCriticalData(
      supabase,
      tenantId,
      selectedDate,
      branchId
    );
    perf.stage("critical-board");
    perf.finish();

    return (
      <FleetDispatchViewClient initialBoard={board} selectedDate={selectedDate} />
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
