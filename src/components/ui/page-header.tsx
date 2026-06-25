import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
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
          <h1 className="cs-text-page-title">{title}</h1>
          {subtitle ? <p className="cs-text-body cs-text-muted ui-page-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="ui-page-header-actions">{actions}</div> : null}
      {meta ? <div className="ui-page-header-meta">{meta}</div> : null}
    </header>
  );

  if (variant === "surface") {
    return (
      <div className="ui-page-header-area cs-surface cs-surface--default cs-panel cs-panel--padding-md">
        {content}
      </div>
    );
  }

  return content;
}
