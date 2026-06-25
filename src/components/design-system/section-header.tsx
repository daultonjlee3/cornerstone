import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`cs-section-header ${className}`}>
      <div className="cs-section-header__main">
        {eyebrow ? <p className="cs-text-eyebrow">{eyebrow}</p> : null}
        <h2 className={`cs-text-section-title ${eyebrow ? "cs-section-header__title--offset" : ""}`}>
          {title}
        </h2>
        {description ? <p className="cs-text-body cs-text-muted cs-section-header__description">{description}</p> : null}
      </div>
      {action ? <div className="cs-section-header__action">{action}</div> : null}
    </div>
  );
}
