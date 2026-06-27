import { createClient } from "@/src/lib/supabase/server";
import { loadFleetTodayViewData } from "@/src/lib/fleet/queries/today-view";
import { FleetTodayView } from "./fleet-today-view";

type FleetCommandCenterSectionProps = {
  tenantId: string;
};

export async function FleetCommandCenterSection({ tenantId }: FleetCommandCenterSectionProps) {
  const supabase = await createClient();
  const fleetTodayView = await loadFleetTodayViewData(supabase, tenantId, { scope: "shell" });
  return <FleetTodayView initialData={fleetTodayView} enrichOnMount />;
}
