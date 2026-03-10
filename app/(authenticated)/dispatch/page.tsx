import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { loadDispatchData } from "./dispatch-data";
import { DispatchView } from "./components/DispatchView";
import { parseFilterStateFromParams } from "./filter-state";

export const metadata = {
  title: "Dispatch | Cornerstone Tech",
  description: "Scheduling & routing operations",
};

type SearchParams = { [key: string]: string | string[] | undefined };

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

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const tenantId = membership.tenant_id;

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);
  const companyIds = (companies ?? []).map((c) => (c as { id: string }).id);

  // Next.js 15+ may pass searchParams as a Promise
  const params = typeof (searchParams as Promise<SearchParams>).then === "function"
    ? await (searchParams as Promise<SearchParams>)
    : (searchParams as SearchParams);

  const filterState = parseFilterStateFromParams(params ?? {});

  const result = await loadDispatchData({
    tenantId,
    companyIds,
    selectedDate: filterState.selectedDate,
    q: filterState.search || null,
    company_id: filterState.companyId || null,
    property_id: filterState.propertyId || null,
    priority: filterState.priority || null,
    status: filterState.status || null,
    crew_id: filterState.crewId || null,
    technician_id: filterState.technicianId || null,
    assignment_type: filterState.assignmentType || null,
    asset_id: filterState.assetId || null,
    category: filterState.category || null,
  });

  return (
    <DispatchView
      initialData={result}
      filterState={filterState}
    />
  );
}
