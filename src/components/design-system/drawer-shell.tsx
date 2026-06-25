import type { ReactNode } from "react";

type DrawerShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "right" | "left";
  className?: string;
};

export function DrawerShell({
  open,
  onClose,
  title,
  children,
  side = "right",
  className = "",
}: DrawerShellProps) {
  if (!open) return null;

  return (
    <div
      className={`cs-drawer-root cs-drawer-root--${side}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div className={`cs-drawer-shell ${className}`} onClick={(e) => e.stopPropagation()}>
        <header className="cs-drawer-shell__header">
          <h2 className="cs-text-body cs-drawer-shell__title">{title}</h2>
          <button type="button" onClick={onClose} className="cs-drawer-shell__close">
            Close
          </button>
        </header>
        <div className="cs-drawer-shell__body">{children}</div>
      </div>
    </div>
  );
}
