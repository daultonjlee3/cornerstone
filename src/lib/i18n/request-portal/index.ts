/**
 * Request portal i18n: locale resolution and translations.
 * Reusable for future multilingual portals (e.g. vendor portal, admin).
 */

import { en } from "./locales/en";
import { es } from "./locales/es";
import { fr } from "./locales/fr";

export type RequestPortalLocaleCode = "en" | "es" | "fr";

export const SUPPORTED_LOCALES: RequestPortalLocaleCode[] = ["en", "es", "fr"];

const LOCALE_MAP = {
  en,
  es,
  fr,
} as const;

export type RequestPortalTranslationKey = keyof typeof en;

/** Get all translations for a locale. Falls back to English for missing keys. */
export function getRequestPortalTranslations(
  locale: RequestPortalLocaleCode
): Record<RequestPortalTranslationKey, string> {
  const dict = LOCALE_MAP[locale] ?? en;
  const fallback = en as Record<string, string>;
  const merged = { ...fallback };
  for (const key of Object.keys(en) as RequestPortalTranslationKey[]) {
    const value = (dict as Record<string, string>)[key];
    if (value != null && value !== "") merged[key] = value;
  }
  return merged as Record<RequestPortalTranslationKey, string>;
}

/** Translate a single key. Safe for server (no hooks). */
export function t(
  locale: RequestPortalLocaleCode,
  key: RequestPortalTranslationKey
): string {
  const dict = LOCALE_MAP[locale] ?? en;
  const value = (dict as Record<string, string>)[key];
  return value != null && value !== "" ? value : (en as Record<string, string>)[key] ?? key;
}

/**
 * Resolve request portal language:
 * 1. Portal override (cookie or param)
 * 2. Tenant default (env PORTAL_DEFAULT_LOCALE)
 * 3. Browser Accept-Language
 * 4. English
 */
export function resolveRequestPortalLocale(options: {
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  envDefaultLocale?: string | null;
}): RequestPortalLocaleCode {
  const { cookieLocale, acceptLanguage, envDefaultLocale } = options;

  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as RequestPortalLocaleCode)) {
    return cookieLocale as RequestPortalLocaleCode;
  }
  if (envDefaultLocale && SUPPORTED_LOCALES.includes(envDefaultLocale as RequestPortalLocaleCode)) {
    return envDefaultLocale as RequestPortalLocaleCode;
  }
  if (acceptLanguage) {
    const preferred = parseAcceptLanguage(acceptLanguage);
    for (const code of preferred) {
      if (SUPPORTED_LOCALES.includes(code as RequestPortalLocaleCode)) {
        return code as RequestPortalLocaleCode;
      }
    }
  }
  return "en";
}

/** Parse Accept-Language and return ordered list of language codes (e.g. ["es", "en"]). */
function parseAcceptLanguage(header: string): string[] {
  const parts = header.split(",").map((p) => {
    const [locale, q] = p.trim().split(";q=");
    const quality = q ? parseFloat(q) : 1;
    const code = (locale || "").split("-")[0].toLowerCase();
    return { code, quality };
  });
  parts.sort((a, b) => b.quality - a.quality);
  return [...new Set(parts.map((p) => p.code).filter(Boolean))];
}

