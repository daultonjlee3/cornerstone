type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`cs-skeleton ${className}`} aria-hidden />;
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`cs-skeleton-group ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="cs-skeleton cs-skeleton--text"
          style={i === lines - 1 && lines > 1 ? { width: "72%" } : undefined}
        />
      ))}
    </div>
  );
}

export function SkeletonKpiGrid({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`cs-skeleton-kpi-grid ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="cs-skeleton cs-skeleton--kpi" />
      ))}
    </div>
  );
}
