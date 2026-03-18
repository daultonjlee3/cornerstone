"use client";

import type { RequestPortalLocaleCode } from "@/src/lib/i18n/request-portal";
import { RequestForm } from "./RequestForm";
import {
  RequestPortalI18nProvider,
  RequestPortalLanguageSwitcher,
  useRequestPortalTranslations,
} from "./RequestPortalI18n";

type PropertyOption = { id: string; name: string };
type AssetOption = { id: string; name: string };

type RequestPortalLayoutProps = {
  initialLocale: RequestPortalLocaleCode;
  properties: PropertyOption[];
  assets: AssetOption[];
  configured?: boolean;
  tenantId?: string;
  companyId?: string;
  portalName?: string | null;
};

function RequestPortalContent({
  properties,
  assets,
  configured = true,
  tenantId,
  companyId,
  portalName,
}: {
  properties: PropertyOption[];
  assets: AssetOption[];
  configured: boolean;
  tenantId?: string;
  companyId?: string;
  portalName?: string | null;
}) {
  const { t } = useRequestPortalTranslations();

  const displayPortalName = portalName?.trim() || null;

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex min-w-0 flex-1 flex-col">
              {displayPortalName ? (
                <>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                    Maintenance Portal
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
                    {displayPortalName}
                  </h1>
                </>
              ) : (
                <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
                  {t("requestPortal.title")}
                </h1>
              )}
              <p className="mt-1 text-sm text-[var(--muted)] sm:text-[0.9rem]">
                {displayPortalName
                  ? t("requestPortal.subtitleWithPortal")
                  : t("requestPortal.subtitle")}
              </p>
            </div>
            <div className="shrink-0">
              <RequestPortalLanguageSwitcher />
            </div>
          </div>
          <div className="hidden text-xs text-[var(--muted)] sm:block">
            {t("requestPortal.trustIntro")}
          </div>
        </header>
        {configured && tenantId && companyId ? (
          <>
            <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)]/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:p-8">
              <RequestForm
                properties={properties}
                assets={assets}
                tenantId={tenantId}
                companyId={companyId}
              />
            </div>
            <div className="mt-6 flex flex-col items-center justify-between gap-2 text-center text-[11px] text-[var(--muted)] sm:mt-8 sm:flex-row sm:text-left">
              <p>{t("requestPortal.footer")}</p>
              <p>{t("requestPortal.trustFooter")}</p>
            </div>
          </>
        ) : (
          <div
            className="rounded-3xl border border-amber-200/80 bg-amber-50/80 p-6 text-center text-sm text-amber-900 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100 sm:p-8"
            role="alert"
          >
            <p className="text-sm font-medium">
              {t("requestPortal.portalTemporarilyUnavailable")}
            </p>
            <p className="mt-2 text-xs sm:text-sm">
              {t("requestPortal.notConfiguredHint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function RequestPortalLayout({
  initialLocale,
  properties,
  assets,
  configured = true,
  tenantId,
  companyId,
  portalName,
}: RequestPortalLayoutProps) {
  return (
    <RequestPortalI18nProvider initialLocale={initialLocale}>
      <RequestPortalContent
        properties={properties}
        assets={assets}
        configured={configured}
        tenantId={tenantId}
        companyId={companyId}
        portalName={portalName}
      />
    </RequestPortalI18nProvider>
  );
}
