"use client";

import Link from "next/link";
import { useRef, useEffect, useState, useLayoutEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
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

const GAP_PX = 4;
const VIEWPORT_PAD = 8;
const Z_MENU = 1100;
const MAX_ITEMS_BEFORE_SCROLL = 6;
const APPROX_ITEM_HEIGHT = 40;

function computeMenuStyle(
  buttonRect: DOMRect,
  menuWidth: number,
  menuHeight: number,
  align: "left" | "right",
  itemCount: number
): React.CSSProperties {
  const maxScrollHeight = APPROX_ITEM_HEIGHT * MAX_ITEMS_BEFORE_SCROLL;
  const wantsScroll = itemCount > MAX_ITEMS_BEFORE_SCROLL;
  const contentHeight = wantsScroll ? Math.min(menuHeight, maxScrollHeight) : menuHeight;

  let left =
    align === "right" ? buttonRect.right - menuWidth : buttonRect.left;
  left = Math.min(
    Math.max(VIEWPORT_PAD, left),
    window.innerWidth - menuWidth - VIEWPORT_PAD
  );

  const spaceBelow =
    window.innerHeight - buttonRect.bottom - GAP_PX - VIEWPORT_PAD;
  const spaceAbove = buttonRect.top - GAP_PX - VIEWPORT_PAD;

  let top = buttonRect.bottom + GAP_PX;
  let maxHeight: number | undefined;

  if (contentHeight <= spaceBelow) {
    top = buttonRect.bottom + GAP_PX;
    maxHeight = wantsScroll ? maxScrollHeight : undefined;
  } else if (contentHeight <= spaceAbove) {
    top = buttonRect.top - contentHeight - GAP_PX;
    maxHeight = wantsScroll ? maxScrollHeight : undefined;
  } else if (spaceBelow >= spaceAbove) {
    top = buttonRect.bottom + GAP_PX;
    maxHeight = Math.max(APPROX_ITEM_HEIGHT * 2, spaceBelow);
  } else {
    maxHeight = Math.max(APPROX_ITEM_HEIGHT * 2, spaceAbove);
    top = buttonRect.top - Math.min(menuHeight, maxHeight) - GAP_PX;
  }

  top = Math.min(
    Math.max(VIEWPORT_PAD, top),
    window.innerHeight - VIEWPORT_PAD - (maxHeight ?? contentHeight)
  );

  return {
    position: "fixed",
    top,
    left,
    zIndex: Z_MENU,
    minWidth: 160,
    ...(maxHeight != null ? { maxHeight, overflowY: "auto" as const } : {}),
  };
}

export function ActionsDropdown({
  items,
  label = "Actions",
  "aria-label": ariaLabel = "Row actions",
  align = "right",
  onOpen,
  onClose,
}: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [enter, setEnter] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    const menu = menuRef.current;
    if (!open || !btn || !menu || typeof window === "undefined") return;

    const rect = btn.getBoundingClientRect();
    const mw = menu.offsetWidth || 160;
    const mh = menu.offsetHeight;
    setMenuStyle(computeMenuStyle(rect, mw, mh, align, items.length));
  }, [open, align, items.length]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle({});
      return;
    }
    updatePosition();
    const raf = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(raf);
  }, [open, items.length, updatePosition]);

  useEffect(() => {
    if (!open) {
      setEnter(false);
      return;
    }
    const id = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setEnter(false);
        onClose?.();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    /** Bubble phase so the same click that opened the menu (on the button) is not treated as outside. */
    const handlePointer = (e: MouseEvent | PointerEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setEnter(false);
      onClose?.();
    };
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const focusable = menuRef.current.querySelector<HTMLElement>(
      "a[href], button:not([disabled])"
    );
    focusable?.focus();
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setEnter(false);
    onClose?.();
  }, [onClose]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) onOpen?.();
    else {
      setEnter(false);
      onClose?.();
    }
  };

  if (items.length === 0) return null;

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const menuNode =
    open &&
    portalTarget && (
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-orientation="vertical"
        style={menuStyle}
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          e.preventDefault();
          const root = menuRef.current;
          if (!root) return;
          const nodes = Array.from(
            root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
          );
          if (nodes.length === 0) return;
          const i = nodes.indexOf(document.activeElement as HTMLElement);
          const delta = e.key === "ArrowDown" ? 1 : -1;
          let next = i < 0 ? 0 : i + delta;
          next = Math.max(0, Math.min(nodes.length - 1, next));
          nodes[next]?.focus();
        }}
        className={`rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg outline-none transition-[opacity,transform] duration-150 ease-out ${
          enter ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {items.map((item, i) => {
          if (item.type === "link") {
            return (
              <Link
                key={i}
                href={item.href}
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-[var(--accent)] hover:bg-[var(--background)] hover:underline"
                onClick={() => {
                  close();
                }}
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
                close();
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
    );

  return (
    <div className="inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1 rounded border border-[var(--card-border)] bg-[var(--background)] px-2.5 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        {label}
        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
      </button>
      {menuNode && portalTarget ? createPortal(menuNode, portalTarget) : null}
    </div>
  );
}
