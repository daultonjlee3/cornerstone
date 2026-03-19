"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const GUIDE_CONFIG: Record<
  string,
  { title: string; body: string; selector: string }
> = {
  "create-asset": {
    title: "Create your first asset",
    body: "Click the button below to add an asset. You can link it to a property and track install date and lifecycle.",
    selector: '[data-get-started="create-asset"]',
  },
  "create-work-order": {
    title: "Create a work order",
    body: "Use the form to create a work order. Add a title, assign a technician, and set due date.",
    selector: '[data-get-started="create-work-order"]',
  },
  assign: {
    title: "Assign a technician",
    body: "Drag a work order onto a technician's row or use the assign action to schedule the work.",
    selector: '[data-get-started="assign"]',
  },
  complete: {
    title: "Complete a work order",
    body: "Open a work order and use Complete to log labor, parts, and resolution.",
    selector: '[data-get-started="complete"]',
  },
};

export function GetStartedOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const guide = searchParams.get("guide");
  const config = guide ? GUIDE_CONFIG[guide] : null;
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const dismiss = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("guide");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!config) {
      setTargetRect(null);
      return;
    }
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(config!.selector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };
    const t = setTimeout(measure, 300);
    const observer = typeof window !== "undefined" && config ? new ResizeObserver(measure) : null;
    const el = config ? document.querySelector(config.selector) : null;
    if (observer && el) observer.observe(el);
    return () => {
      cancelled = true;
      clearTimeout(t);
      observer?.disconnect();
    };
  }, [config]);

  if (!config) return null;

  return (
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-labelledby="get-started-overlay-title">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={dismiss}
      />
      {targetRect && (
        <div
          className="pointer-events-none absolute rounded-lg border-2 border-[var(--accent)] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}
      <div className="absolute bottom-6 left-4 right-4 z-[9999] rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-lg sm:left-auto sm:right-6 sm:max-w-sm">
        <h2 id="get-started-overlay-title" className="font-semibold text-[var(--foreground)]">
          {config.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{config.body}</p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-4 w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
