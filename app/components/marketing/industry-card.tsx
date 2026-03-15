import Link from "next/link";

type Props = {
  title: string;
  href: string;
};

export function IndustryCard({ title, href }: Props) {
  return (
    <Link
      href={href}
      className="flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 text-center shadow-[var(--shadow-soft)] transition-all duration-200 hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)] hover:text-[var(--accent)] sm:p-6"
    >
      <span className="font-semibold text-[var(--foreground)]">{title}</span>
    </Link>
  );
}
