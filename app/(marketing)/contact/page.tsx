import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES, SEO, SITE_NAME, buildMarketingMetadata } from "@/lib/marketing-site";
import { ArrowRight, Mail, Rocket } from "lucide-react";

const seo = SEO[ROUTES.contact];

export const metadata: Metadata = buildMarketingMetadata(
  seo.title,
  seo.description,
  ROUTES.contact
);

const CONTACT_EMAIL = "support@cornerstonecmms.com";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      {/* Hero */}
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          Contact & Demo
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]">
          Get in touch for a demo, founding customer application, or general questions. You can
          also start a free trial and explore {SITE_NAME} on your own.
        </p>
      </header>

      {/* Contact options */}
      <section className="mt-14 grid gap-6 sm:grid-cols-2">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 transition-all hover:border-[var(--accent)] hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Mail className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              Email us
            </h2>
            <p className="mt-1 text-[var(--muted)]">
              For demos, founding customer applications, or support.
            </p>
            <p className="mt-3 font-medium text-[var(--accent)]">{CONTACT_EMAIL}</p>
          </div>
        </a>
        <Link
          href={ROUTES.signup}
          className="flex gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 transition-all hover:border-[var(--accent)] hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <Rocket className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              Start free trial
            </h2>
            <p className="mt-1 text-[var(--muted)]">
              Explore the product yourself—no demo required.
            </p>
            <p className="mt-3 font-medium text-[var(--accent)]">Get started →</p>
          </div>
        </Link>
      </section>

      {/* Demo / founding */}
      <section className="mt-14 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Request a demo or apply for founding customer access
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          Send us an email at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          with your name, organization, and what you’re looking for. We’ll get back to you
          to schedule a demo or discuss the Founding Customer Program.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Demo%20request`}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Request a demo
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <Link
            href={ROUTES.foundingCustomer}
            className="inline-flex items-center rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-5 py-3 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Founding Customer Program
          </Link>
        </div>
      </section>
    </div>
  );
}
