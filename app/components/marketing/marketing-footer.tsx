import Link from "next/link";
import { NAV, ROUTES, SITE_NAME, SITE_TAGLINE, FEATURES, INDUSTRIES } from "@/lib/marketing-site";

const footerLinks = {
  product: [
    { label: "Product Overview", href: ROUTES.product },
    { label: "Inventory & Procurement", href: ROUTES.productInventoryProcurement },
    ...FEATURES.map((f) => ({ label: f.title, href: f.href })),
    { label: "Pricing", href: ROUTES.pricing },
  ],
  industries: INDUSTRIES.map((i) => ({ label: i.title, href: i.href })),
  company: [
    { label: "About", href: ROUTES.about },
    { label: "Contact", href: ROUTES.contact },
    { label: "Founding Customer Program", href: ROUTES.foundingCustomer },
    { label: "How It Works", href: ROUTES.howItWorks },
  ],
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
      <div className="mx-auto min-w-0 max-w-7xl px-4 py-10 sm:px-6 sm:py-12 md:py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div>
            <Link
              href={ROUTES.home}
              className="text-lg font-semibold tracking-tight text-[var(--foreground)]"
            >
              {SITE_NAME}
            </Link>
            <p className="mt-2 mk-caption">{SITE_TAGLINE}</p>
            <p className="mt-4 text-xs text-[var(--muted)]/70 leading-relaxed">
              Maintenance operations software for facility teams, industrial
              operations, school districts, and healthcare.
            </p>
          </div>

          {/* Product */}
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

          {/* Industries */}
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

          {/* Company + Legal */}
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
            </ul>
            <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-[var(--foreground)]">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
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

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[var(--card-border)] pt-6 sm:mt-12 sm:flex-row sm:gap-4 sm:pt-8">
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
