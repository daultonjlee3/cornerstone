import Link from "next/link";
import type { RequestPortalLocaleCode } from "@/src/lib/i18n/request-portal";
import { t } from "@/src/lib/i18n/request-portal";

type Props = {
  portals: { slug: string; name: string }[];
  locale: RequestPortalLocaleCode;
};

/**
 * Shown when multiple public portals exist and /request cannot pick one automatically.
 */
export function RequestPortalIndexPicker({ portals, locale }: Props) {
  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 text-center sm:mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {t(locale, "requestPortal.chooseOrgTitle")}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)] sm:text-[0.9rem]">
            {t(locale, "requestPortal.chooseOrgSubtitle")}
          </p>
        </header>
        <ul className="flex flex-col gap-3">
          {portals.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/request/${encodeURIComponent(p.slug)}`}
                className="block rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4 text-base font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-xs text-[var(--muted)]">{t(locale, "requestPortal.footer")}</p>
      </div>
    </div>
  );
}
