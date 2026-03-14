"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const GAP = 6;

type Placement = "top" | "bottom" | "left" | "right";

type TooltipContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  placement: Placement;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  contentId: string;
  triggerId: string;
  delayMs: number;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("Tooltip components must be used within Tooltip");
  return ctx;
}

type TooltipProviderProps = {
  children: ReactNode;
  delayMs?: number;
  defaultPlacement?: Placement;
};

export function TooltipProvider({
  children,
  delayMs = 200,
  defaultPlacement = "top",
}: TooltipProviderProps) {
  return <>{children}</>;
}

type TooltipProps = {
  children: ReactNode;
  placement?: Placement;
  delayMs?: number;
};

export function Tooltip({
  children,
  placement = "top",
  delayMs = 200,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const contentId = useId();
  const triggerId = useId();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleShow = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), delayMs);
  }, [delayMs]);

  const cancelSchedule = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(false);
  }, []);

  const value: TooltipContextValue = {
    open,
    setOpen,
    placement,
    triggerRef,
    contentId,
    triggerId,
    delayMs,
  };

  return (
    <TooltipContext.Provider value={value}>
      <div
        className="inline-flex"
        onMouseEnter={scheduleShow}
        onMouseLeave={cancelSchedule}
        onFocus={scheduleShow}
        onBlur={cancelSchedule}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

type TooltipTriggerProps = {
  children: ReactNode;
  asChild?: boolean;
};

export function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
  const { triggerRef, triggerId, contentId, open } = useTooltipContext();

  const trigger = (
    <div
      ref={triggerRef}
      id={triggerId}
      aria-describedby={open ? contentId : undefined}
      className="inline-flex cursor-default"
    >
      {children}
    </div>
  );

  return trigger;
}

function getContentStyle(
  placement: Placement,
  rect: DOMRect
): React.CSSProperties {
  switch (placement) {
    case "top":
      return {
        position: "fixed" as const,
        left: rect.left + rect.width / 2,
        top: rect.top - GAP,
        transform: "translate(-50%, -100%)",
      };
    case "bottom":
      return {
        position: "fixed" as const,
        left: rect.left + rect.width / 2,
        top: rect.bottom + GAP,
        transform: "translate(-50%, 0)",
      };
    case "left":
      return {
        position: "fixed" as const,
        left: rect.left - GAP,
        top: rect.top + rect.height / 2,
        transform: "translate(-100%, -50%)",
      };
    case "right":
      return {
        position: "fixed" as const,
        left: rect.right + GAP,
        top: rect.top + rect.height / 2,
        transform: "translate(0, -50%)",
      };
    default:
      return {};
  }
}

type TooltipContentProps = {
  children: ReactNode;
  side?: Placement;
  className?: string;
};

export function TooltipContent({
  children,
  side,
  className = "",
}: TooltipContentProps) {
  const { open, placement, triggerRef, contentId } = useTooltipContext();
  const [style, setStyle] = useState<React.CSSProperties>({});
  const p = side ?? placement;

  const updatePosition = useCallback(() => {
    if (typeof document === "undefined" || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setStyle(getContentStyle(p, rect));
  }, [p, triggerRef]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, updatePosition]);

  const content = open ? (
    <div
      id={contentId}
      role="tooltip"
      className={`pointer-events-none z-[100] max-w-[240px] rounded-lg bg-[var(--foreground)] px-2.5 py-1.5 text-xs font-medium text-white shadow-md ${className}`}
      style={style}
    >
      {children}
    </div>
  ) : null;

  if (open && typeof document !== "undefined" && content) {
    return createPortal(content, document.body);
  }
  return null;
}

export { TooltipSimple as SidebarTooltip } from "./simple";
