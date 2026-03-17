"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const GAP_PX = 8;

type TooltipSimpleProps = {
  children: React.ReactNode;
  label: string;
  side?: "right" | "left" | "top" | "bottom";
  className?: string;
};

/** Simple label-only tooltip used by sidebar when collapsed. */
export function TooltipSimple({
  children,
  label,
  side = "right",
  className,
}: TooltipSimpleProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (typeof document === "undefined" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    switch (side) {
      case "right":
        setCoords({ top: rect.top + rect.height / 2, left: rect.right + GAP_PX });
        break;
      case "left":
        setCoords({ top: rect.top + rect.height / 2, left: rect.left - GAP_PX });
        break;
      case "top":
        setCoords({ top: rect.top - GAP_PX, left: rect.left + rect.width / 2 });
        break;
      case "bottom":
        setCoords({ top: rect.bottom + GAP_PX, left: rect.left + rect.width / 2 });
        break;
      default:
        setCoords({ top: rect.top + rect.height / 2, left: rect.right + GAP_PX });
    }
  }, [side]);

  const show = useCallback(() => {
    updatePosition();
    setVisible(true);
  }, [updatePosition]);

  const hide = useCallback(() => setVisible(false), []);

  const tooltipEl =
    visible && label ? (
      <div
        role="tooltip"
        className="pointer-events-none fixed z-[100] max-w-[200px] rounded-lg border border-[var(--card-border)] bg-[var(--card-solid)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-lg transition-opacity duration-150"
        style={{
          top: coords.top,
          left: coords.left,
          transform:
            side === "right" || side === "left"
              ? "translateY(-50%)"
              : side === "top"
                ? "translate(-50%, -100%)"
                : "translate(-50%, 0)",
        }}
      >
        {label}
      </div>
    ) : null;

  return (
    <>
      <div
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={className ? `inline-flex ${className}` : "inline-flex"}
      >
        {children}
      </div>
      {typeof document !== "undefined" && tooltipEl
        ? createPortal(tooltipEl, document.body)
        : null}
    </>
  );
}
