import type { ReactNode } from "react";

type PageLayoutProps = {
  children: ReactNode;
  /** Exactly one hero region per page — the primary focal surface. */
  hero?: ReactNode;
  className?: string;
};

export function PageLayout({ children, hero, className = "" }: PageLayoutProps) {
  return (
    <div className={`cs-page-layout ${className}`}>
      {hero ? <div className="cs-page-layout__hero">{hero}</div> : null}
      <div className="cs-page-layout__body">{children}</div>
    </div>
  );
}

export function PageSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`cs-page-section ${className}`}>{children}</section>;
}
