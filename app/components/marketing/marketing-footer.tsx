import Link from "next/link";
import { NAV, ROUTES, SITE_NAME, SITE_TAGLINE, FEATURES, INDUSTRIES } from "@/lib/marketing-site";

const footerLinks = {
  product: [
    { label: "Product Overview", href: ROUTES.product },
    ...FEATURES.map((f) => ({ label: f.title, href: f.href })),
    { label: "Pricing", href: ROUTES.pricing },
  ],
  industries: INDUSTRIES.map((i) => ({ label: i.title, href: i.href })),
  company: [
    { label: "How It Works", href: ROUTES.howItWorks },
    { label: "About", href: ROUTES.about },
    { label: "Contact", href: ROUTES.contact },
  ],
  program: [{ label: "Founding Customer Program", href: ROUTES.foundingCustomer }],
  legal: [
    { label: "Privacy Policy", href: ROUTES.privacy },
    { label: "Terms of Service", href: ROUTES.terms },
  ],
};

const linkClass =
  "mk-caption transition-colors duration-200 hover:text-[var(--accent)]";

export function MarketingFooter() {
  return (
    <footer className="min-w-0 border-t border-[var(--card-border)] bg-[var(--card)]">
      <div className="mx-auto min-w-0 max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-12 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href={ROUTES.home}
              className="text-lg font-semibold tracking-tight text-[var(--foreground)]"
            >
              {SITE_NAME}
            </Link>
            <p className="mt-2 mk-caption">{SITE_TAGLINE}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.product.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
              Industries
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.industries.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
              {footerLinks.program.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
              {footerLinks.legal.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[var(--card-border)] pt-8 sm:flex-row">
          <p className="mk-caption">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p className="mk-caption">
            Contact:{" "}
            <a
              href="mailto:support@cornerstonecmms.com"
              className="transition-colors hover:text-[var(--accent)]"
            >
              support@cornerstonecmms.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
