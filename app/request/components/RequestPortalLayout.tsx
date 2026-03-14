"use client";

import type { RequestPortalLocaleCode } from "@/src/lib/i18n/request-portal";
import { RequestForm } from "./RequestForm";
import { RequestPortalI18nProvider, RequestPortalLanguageSwitcher, useRequestPortalTranslations } from "./RequestPortalI18n";

type PropertyOption = { id: string; name: string };
type AssetOption = { id: string; name: string };

type RequestPortalLayoutProps = {
  initialLocale: RequestPortalLocaleCode;
  properties: PropertyOption[];
  assets: AssetOption[];
};

function RequestPortalContent({ properties, assets }: { properties: PropertyOption[]; assets: AssetOption[] }) {
  const { t } = useRequestPortalTranslations();

  return (
    <div className="min-h-screen px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <div className="mb-3 flex justify-end sm:justify-center">
            <RequestPortalLanguageSwitcher />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {t("requestPortal.title")}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("requestPortal.subtitle")}
          </p>
        </header>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] sm:p-10">
          <RequestForm properties={properties} assets={assets} />
        </div>
        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          {t("requestPortal.footer")}
        </p>
      </div>
    </div>
  );
}

export function RequestPortalLayout({ initialLocale, properties, assets }: RequestPortalLayoutProps) {
  return (
    <RequestPortalI18nProvider initialLocale={initialLocale}>
      <RequestPortalContent properties={properties} assets={assets} />
    </RequestPortalI18nProvider>
  );
}
