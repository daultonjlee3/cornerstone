import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  className = "",
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`ui-page-header ${className}`}>
      <div>
        <h1 className="ui-page-title">{title}</h1>
        {subtitle ? <p className="ui-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
