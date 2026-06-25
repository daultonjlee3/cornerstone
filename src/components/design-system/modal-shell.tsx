import type { ReactNode } from "react";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function ModalShell({
  open,
  onClose,
  title,
  description,
  children,
  className = "",
}: ModalShellProps) {
  if (!open) return null;

  return (
    <div className="cs-modal-root">
      <button
        type="button"
        onClick={onClose}
        className="cs-modal-overlay"
        aria-label="Close modal overlay"
      />
      <div role="dialog" aria-modal="true" className={`cs-modal-shell ${className}`}>
        <header className="cs-modal-shell__header">
          <h2 className="cs-text-section-title">{title}</h2>
          {description ? <p className="cs-text-caption cs-text-muted cs-modal-shell__description">{description}</p> : null}
        </header>
        <div className="cs-modal-shell__body">{children}</div>
      </div>
    </div>
  );
}
