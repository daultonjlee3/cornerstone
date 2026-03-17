import type { ReactNode } from "react";

type HelpDrawerProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function HelpDrawer({ title, open, onClose, children }: HelpDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-[var(--foreground)]">
          {children}
        </div>
      </div>
    </div>
  );
}

