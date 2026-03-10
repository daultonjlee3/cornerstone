type LocationBreadcrumbProps = {
  company?: string | null;
  property?: string | null;
  building?: string | null;
  unit?: string | null;
  className?: string;
};

export function LocationBreadcrumb({
  company,
  property,
  building,
  unit,
  className = "",
}: LocationBreadcrumbProps) {
  const parts = [company, property, building, unit].filter(
    (value): value is string => Boolean(value && value.trim())
  );

  if (parts.length === 0) {
    return <p className={`text-xs text-[var(--muted)] ${className}`}>No location selected</p>;
  }

  return (
    <nav className={`flex flex-wrap items-center gap-1 text-xs text-[var(--muted)] ${className}`}>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 ? <span className="text-[var(--card-border)]">/</span> : null}
          <span className="rounded bg-[var(--background)] px-2 py-0.5 text-[var(--foreground)]">
            {part}
          </span>
        </span>
      ))}
    </nav>
  );
}
