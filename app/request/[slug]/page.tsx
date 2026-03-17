import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { resolveRequestPortalLocale, t } from "@/src/lib/i18n/request-portal";
import { RequestPortalLayout } from "../components/RequestPortalLayout";

type PropertyOption = { id: string; name: string };
type AssetOption = { id: string; name: string };

async function getRequestPageLocale(): Promise<"en" | "es" | "fr"> {
  const cookieStore = await cookies();
  const acceptLanguage = (await headers()).get("accept-language");
  return resolveRequestPortalLocale({
    cookieLocale: cookieStore.get("request_portal_locale")?.value ?? null,
    acceptLanguage,
    envDefaultLocale: process.env.PORTAL_DEFAULT_LOCALE?.trim() || null,
  });
}

async function getPortalCompanyBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, tenant_id, portal_enabled, status")
    .eq("slug", slug)
    .maybeSingle();
  return data as { id: string; tenant_id: string; portal_enabled?: boolean | null; status?: string | null } | null;
}

async function getPortalProperties(companyId: string | undefined): Promise<PropertyOption[]> {
  if (!companyId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name")
    .limit(100);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return { id: r.id as string, name: (r.name as string) || "Property" };
  });
}

async function getPortalAssets(companyId: string | undefined): Promise<AssetOption[]> {
  if (!companyId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("id, asset_name, name")
    .eq("company_id", companyId)
    .order("asset_name")
    .order("name")
    .limit(200);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: (r.asset_name as string | null) ?? (r.name as string | null) ?? "Asset",
    };
  });
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata() {
  const locale = await getRequestPageLocale();
  return {
    title: `${t(locale, "requestPortal.title")} | Cornerstone OS`,
    description: t(locale, "requestPortal.subtitle"),
  };
}

export default async function RequestPortalBySlugPage(props: PageProps) {
  const { slug } = await props.params;
  const company = await getPortalCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  const portalEnabled = company.portal_enabled ?? false;
  const isActive = (company.status ?? "active") === "active";
  const configured = portalEnabled && isActive;

  const locale = await getRequestPageLocale();
  const [properties, assets] = await Promise.all([
    getPortalProperties(company.id),
    getPortalAssets(company.id),
  ]);

  return (
    <RequestPortalLayout
      initialLocale={locale}
      properties={properties}
      assets={assets}
      configured={configured}
      tenantId={company.tenant_id}
      companyId={company.id}
    />
  );
}

