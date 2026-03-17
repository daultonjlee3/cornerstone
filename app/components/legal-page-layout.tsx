import Link from "next/link";
import { ReactNode } from "react";

type LegalPageLayoutProps = {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPageLayout({
  title,
  subtitle,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Top branding + back link */}
      <header className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--card-solid)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded"
          >
            ← Back to sign in
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-[var(--foreground)] transition-colors hover:text-[var(--accent)]"
          >
            Cornerstone OS
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 sm:py-10">
        <article className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-solid)] p-6 shadow-[var(--shadow-card)] sm:p-8 md:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-lg font-medium text-[var(--muted)]">{subtitle}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Last updated: {lastUpdated}</p>
          <div className="mt-10 space-y-10 border-t border-[var(--card-border)] pt-10">
            {children}
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--card-border)] bg-[var(--card-solid)]/80 py-6">
        <div className="mx-auto max-w-[900px] px-4 text-center text-sm text-[var(--muted)] sm:px-6">
          © 2026 Cornerstone OS. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
        {title}
      </h2>
      <div className="mt-3 text-[15px] leading-relaxed text-[var(--foreground)] [&>ul]:mt-3 [&>ul]:space-y-1 [&>ul]:pl-5 [&>ul]:list-disc [&>p]:mt-2">
        {children}
      </div>
    </section>
  );
}
