import { cookies, headers } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";
import { resolveRequestPortalLocale, t } from "@/src/lib/i18n/request-portal";
import { RequestPortalLayout } from "./components/RequestPortalLayout";

type PropertyOption = { id: string; name: string };
type AssetOption = { id: string; name: string };

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
      name:
        (r.asset_name as string | null) ?? (r.name as string | null) ?? "Asset",
    };
  });
}

async function getRequestPageLocale(): Promise<"en" | "es" | "fr"> {
  const cookieStore = await cookies();
  const acceptLanguage = (await headers()).get("accept-language");
  return resolveRequestPortalLocale({
    cookieLocale: cookieStore.get("request_portal_locale")?.value ?? null,
    acceptLanguage,
    envDefaultLocale: process.env.PORTAL_DEFAULT_LOCALE?.trim() || null,
  });
}

export async function generateMetadata() {
  const locale = await getRequestPageLocale();
  return {
    title: `${t(locale, "requestPortal.title")} | Cornerstone OS`,
    description: t(locale, "requestPortal.subtitle"),
  };
}

export default async function RequestPage() {
  const companyId = process.env.PORTAL_COMPANY_ID?.trim();
  const locale = await getRequestPageLocale();
  const [properties, assets] = await Promise.all([
    getPortalProperties(companyId),
    getPortalAssets(companyId),
  ]);

  return (
    <RequestPortalLayout
      initialLocale={locale}
      properties={properties}
      assets={assets}
    />
  );
}
