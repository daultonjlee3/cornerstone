import type { ReactNode } from "react";

export type PageHeaderProps = {
  /** Page title */
  title: string;
  /** Optional short description under the title */
  subtitle?: string;
  /** Optional icon (e.g. Lucide icon element) shown in a soft container */
  icon?: ReactNode;
  /** Right-aligned actions (buttons, links) */
  actions?: ReactNode;
  /** Optional row below subtitle: stats, filters, breadcrumbs, pills */
  meta?: ReactNode;
  /** Optional: wrap header in a subtle surface/divider for emphasis */
  variant?: "default" | "surface";
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  meta,
  variant = "default",
  className = "",
}: PageHeaderProps) {
  const content = (
    <header className={`ui-page-header ${className}`}>
      <div className="ui-page-header-main">
        {icon ? (
          <div className="ui-page-header-icon" aria-hidden>
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="ui-page-title">
            {title}
          </h1>
          {subtitle ? (
            <p className="ui-page-subtitle">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="ui-page-header-actions">
          {actions}
        </div>
      ) : null}
      {meta ? (
        <div className="ui-page-header-meta">
          {meta}
        </div>
      ) : null}
    </header>
  );

  if (variant === "surface") {
    return (
      <div className="ui-page-header-area">
        {content}
      </div>
    );
  }

  return content;
}
