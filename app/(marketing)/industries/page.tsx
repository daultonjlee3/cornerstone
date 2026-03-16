import type { Metadata } from "next";
import Link from "next/link";
import { INDUSTRIES, SITE_NAME, SEO, buildMarketingMetadata } from "@/lib/marketing-site";

const seo = SEO["/industries"];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  "/industries"
);

export default function IndustriesIndexPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Industries</h1>
      <p className="mt-2 text-[var(--muted)]">
        {SITE_NAME} serves maintenance and operations teams across these markets.{" "}
        <Link href="/pricing" className="font-medium text-[var(--accent)] hover:underline">
          View pricing
        </Link>
        .
      </p>
      <ul className="mt-8 space-y-4">
        {INDUSTRIES.map((i) => (
          <li key={i.slug}>
            <Link
              href={i.href}
              className="font-medium text-[var(--accent)] hover:underline"
            >
              {i.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
