import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  href: string;
  children?: ReactNode;
};

export function FeatureCard({ title, href, children }: Props) {
  return (
    <Link
      href={href}
      className="group flex min-h-[44px] flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)] sm:p-6"
    >
      <h3 className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">
        {title}
      </h3>
      {children && <div className="mt-4">{children}</div>}
    </Link>
  );
}
