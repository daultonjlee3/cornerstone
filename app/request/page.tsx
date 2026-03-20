import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveRequestPortalLocale, t } from "@/src/lib/i18n/request-portal";
import { resolveRequestPortalIndex } from "@/src/lib/request-portal-routing";
import { RequestPortalLayout } from "./components/RequestPortalLayout";
import { RequestPortalIndexPicker } from "./components/RequestPortalIndexPicker";

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
  const result = await resolveRequestPortalIndex();

  if (result.type === "redirect") {
    redirect(`/request/${encodeURIComponent(result.slug)}`);
  }

  if (result.type === "pick") {
    return <RequestPortalIndexPicker portals={result.portals} locale={locale} />;
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
