"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export type ActionsDropdownItem =
  | { type: "link"; label: string; href: string }
  | { type: "button"; label: string; onClick: () => void; disabled?: boolean; destructive?: boolean };

type ActionsDropdownProps = {
  items: ActionsDropdownItem[];
  label?: string;
  "aria-label"?: string;
  align?: "left" | "right";
  /** Prevent row click when opening (e.g. when row is clickable). */
  onOpen?: () => void;
  onClose?: () => void;
};

export function ActionsDropdown({
  items,
  label = "Actions",
  "aria-label": ariaLabel = "Row actions",
  align = "right",
  onOpen,
  onClose,
}: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onClose?.();
      }
    };
    document.addEventListener("click", handle, true);
    return () => document.removeEventListener("click", handle, true);
  }, [open, onClose]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) onOpen?.();
    else onClose?.();
  };

  if (items.length === 0) return null;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1 rounded border border-[var(--card-border)] bg-[var(--background)] px-2.5 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        {label}
        <ChevronDown className="size-3.5 shrink-0 opacity-70" />
      </button>
      {open && (
        <div
          className={`absolute top-full z-20 mt-1 min-w-[160px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
          role="menu"
        >
          {items.map((item, i) => {
            if (item.type === "link") {
              return (
                <Link
                  key={i}
                  href={item.href}
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-[var(--accent)] hover:bg-[var(--background)] hover:underline"
                  onClick={() => { setOpen(false); onClose?.(); }}
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                  onClose?.();
                }}
                className={`block w-full px-3 py-2 text-left text-sm disabled:opacity-50 ${
                  item.destructive
                    ? "text-red-500 hover:bg-red-500/10"
                    : "text-[var(--foreground)] hover:bg-[var(--background)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
