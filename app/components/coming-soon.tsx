import Link from "next/link";

type ComingSoonProps = {
  moduleName: string;
  description?: string;
};

export function ComingSoon({ moduleName, description }: ComingSoonProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          {moduleName}
        </h1>
        {description && (
          <p className="mt-1 text-[var(--muted)]">{description}</p>
        )}
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-16 px-6 text-center">
        <p className="text-[var(--muted)]">This module is coming soon.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
