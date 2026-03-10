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
        className="absolute inset-0 bg-black/60"
        aria-label="Close modal overlay"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-2xl ${className}`}
      >
        <header className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
