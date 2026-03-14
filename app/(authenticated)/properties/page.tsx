import { MapPin } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { PropertiesList } from "./components/properties-list";
import { resolveMapboxPublicTokenFromEnv } from "@/src/lib/mapbox-token";
import { PageHeader } from "@/src/components/ui/page-header";

export const metadata = {
  title: "Properties | Cornerstone Tech",
  description: "Manage properties",
};

export default async function PropertiesPage() {
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

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", membership.tenant_id)
    .order("name");

  const companyIds = (companies ?? []).map((c) => c.id);
  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={<MapPin className="size-5" />}
          title="Properties"
          subtitle="Manage properties for your organization."
        />
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">Create a company first, then add properties.</p>
        </div>
      </div>
    );
  }

  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, property_name, name, company_id, address_line1, address_line2, city, state, zip, country, latitude, longitude, status, companies(name)")
    .in("company_id", companyIds)
    .order("name");

  const normalized = (properties ?? []).map((p) => {
    const raw = p as { companies?: { name: string } | { name: string }[] };
    const companyData = Array.isArray(raw.companies) ? raw.companies[0] : raw.companies;
    return {
      ...p,
      company: companyData ? { name: companyData.name } : null,
    };
  });

  const mapboxToken = resolveMapboxPublicTokenFromEnv();

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<MapPin className="size-5" />}
        title="Properties"
        subtitle="Manage properties for your organization."
      />
      <PropertiesList
        properties={normalized}
        companies={companies ?? []}
        error={error?.message ?? null}
        mapboxToken={mapboxToken}
      />
    </div>
  );
}
