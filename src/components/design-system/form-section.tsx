import type { ReactNode } from "react";
import { Panel } from "./panel";
import { SectionHeader } from "./section-header";

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function FormSection({ title, description, children, className = "" }: FormSectionProps) {
  return (
    <Panel level="default" padding="md" className={`cs-form-section ${className}`}>
      <SectionHeader title={title} description={description} className="cs-form-section__header" />
      <div className="cs-form-section__body">{children}</div>
    </Panel>
  );
}
