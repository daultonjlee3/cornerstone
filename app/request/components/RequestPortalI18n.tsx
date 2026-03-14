"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type RequestPortalLocaleCode,
  type RequestPortalTranslationKey,
  getRequestPortalTranslations,
  SUPPORTED_LOCALES,
} from "@/src/lib/i18n/request-portal";

const COOKIE_NAME = "request_portal_locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type RequestPortalI18nContextValue = {
  locale: RequestPortalLocaleCode;
  setLocale: (locale: RequestPortalLocaleCode) => void;
  t: (key: RequestPortalTranslationKey) => string;
};

const RequestPortalI18nContext = createContext<RequestPortalI18nContextValue | null>(null);

export function useRequestPortalTranslations(): RequestPortalI18nContextValue {
  const ctx = useContext(RequestPortalI18nContext);
  if (!ctx) {
    throw new Error("useRequestPortalTranslations must be used within RequestPortalI18nProvider");
  }
  return ctx;
}

type RequestPortalI18nProviderProps = {
  initialLocale: RequestPortalLocaleCode;
  children: ReactNode;
};

export function RequestPortalI18nProvider({ initialLocale, children }: RequestPortalI18nProviderProps) {
  const [locale, setLocaleState] = useState<RequestPortalLocaleCode>(initialLocale);

  const setLocale = useCallback((next: RequestPortalLocaleCode) => {
    setLocaleState(next);
    if (typeof document !== "undefined") {
      document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }
  }, []);

  const t = useCallback(
    (key: RequestPortalTranslationKey): string => {
      const dict = getRequestPortalTranslations(locale);
      return dict[key] ?? key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <RequestPortalI18nContext.Provider value={value}>
      {children}
    </RequestPortalI18nContext.Provider>
  );
}

const LANGUAGE_OPTIONS: { code: RequestPortalLocaleCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

export function RequestPortalLanguageSwitcher() {
  const { locale, setLocale } = useRequestPortalTranslations();

  return (
    <div className="flex items-center justify-end gap-1 sm:justify-center">
      <span className="sr-only">Language</span>
      {LANGUAGE_OPTIONS.map((opt) => (
        <button
          key={opt.code}
          type="button"
          onClick={() => setLocale(opt.code)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
            locale === opt.code
              ? "bg-[var(--accent)]/15 text-[var(--accent)]"
              : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
          }`}
          aria-pressed={locale === opt.code}
          aria-label={`Language: ${opt.label}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export { SUPPORTED_LOCALES };
