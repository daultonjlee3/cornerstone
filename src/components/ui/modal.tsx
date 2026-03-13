import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className = "",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-label="Close modal overlay"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] border border-[var(--card-border)] bg-white/96 shadow-[var(--shadow-card)] ${className}`}
      >
        <header className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-white/95 px-6 py-4 backdrop-blur">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
