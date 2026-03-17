import Link from "next/link";

type ComingSoonProps = {
  moduleName: string;
};

export function ComingSoon({ moduleName }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-16 px-6 text-center">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
        {moduleName}
      </h2>
      <p className="mt-2 text-[var(--muted)]">This module is coming soon.</p>
      <Link
        href="/operations"
        className="mt-6 inline-flex items-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
      >
        Back to Operations Center
      </Link>
    </div>
  );
}
