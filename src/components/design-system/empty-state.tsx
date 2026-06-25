import type { ReactNode } from "react";
import { Panel } from "./panel";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <Panel padding="none" className={`cs-empty-state ${className}`}>
      {icon ? <div className="cs-empty-state__icon">{icon}</div> : null}
      <p className="cs-text-body cs-empty-state__title">{title}</p>
      {description ? <p className="cs-text-caption cs-text-muted cs-empty-state__description">{description}</p> : null}
      {action ? <div className="cs-empty-state__action">{action}</div> : null}
    </Panel>
  );
}
