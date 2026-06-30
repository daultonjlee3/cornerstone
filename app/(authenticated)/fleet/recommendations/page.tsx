import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser, getProductProfileForTenant } from "@/src/lib/auth-context";
import { loadRecommendationTrustDashboard } from "@/src/lib/fleet-recommendation-engine/trust-dashboard";
import { RecommendationTrustDashboardView } from "./components/recommendation-trust-dashboard";

export const metadata = {
  title: "Recommendation Trust | Cornerstone Fleet Intelligence",
  description: "Recommendation history, measured outcomes, and dispatcher trust metrics",
};

export default async function FleetRecommendationsTrustPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const productProfile = await getProductProfileForTenant(tenantId, supabase);
  if (productProfile !== "fleet_intelligence" && productProfile !== "hybrid") {
    redirect("/operations");
  }

  const dashboard = await loadRecommendationTrustDashboard(supabase, tenantId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RecommendationTrustDashboardView dashboard={dashboard} />
    </div>
  );
}
