import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
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
  const locale = await getRequestPageLocale();
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("slug, portal_enabled, allow_public_requests, status")
    .eq("portal_enabled", true)
    .eq("allow_public_requests", true);

  const rows =
    (data ?? []) as {
      slug: string | null;
      portal_enabled?: boolean | null;
      allow_public_requests?: boolean | null;
      status?: string | null;
    }[];

  const activeRows = rows.filter((c) => (c.status ?? "active") === "active" && c.slug);
  const isDev = process.env.NODE_ENV !== "production";

  if (activeRows.length > 0 && activeRows[0].slug) {
    // In dev, always redirect to the first active portal to make testing easy.
    // In prod, only auto-redirect when there is a single active portal.
    if (isDev || activeRows.length === 1) {
      if (isDev) {
        console.log("[RequestPortal] /request dev redirect", {
          targetSlug: activeRows[0].slug,
          count: activeRows.length,
        });
      }
      redirect(`/request/${activeRows[0].slug}`);
    }
  } else if (isDev) {
    console.log("[RequestPortal] /request has no active portals", {
      found: rows.length,
    });
  }

  return (
    <RequestPortalLayout
      initialLocale={locale}
      properties={[]}
      assets={[]}
      configured={false}
      tenantId={undefined}
      companyId={undefined}
    />
  );
}
