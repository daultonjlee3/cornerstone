"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Sparkles, MapPin, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import { sidebarTourSteps } from "@/config/tourSteps";

const SPOTLIGHT_PADDING = 10;
const CARD_WIDTH = 320;
const CARD_HEIGHT_ESTIMATE = 230;
const VIEWPORT_PADDING = 16;
const SIDEBAR_GAP = 12;

/** Renders the spotlight highlight, step card, backdrop and modals for the sidebar-focused product tour. */
export function GuidedTour() {
  const {
    isWelcomeOpen,
    isActive,
    isCompletionOpen,
    stepIndex,
    totalSteps,
    currentTarget,
    startTour,
    skipTour,
    nextStep,
    prevStep,
    dismissWelcome,
    closeCompletion,
  } = useGuidedTour();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  // Hydration guard — portals need document
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track target element position each time the step changes
  useEffect(() => {
    if (!isActive || !currentTarget) {
      setTargetRect(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector<HTMLElement>(currentTarget);
      if (!el) {
        setTargetRect(null);
        return;
      }
      // Scroll the sidebar item into view
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const rect = el.getBoundingClientRect();
      setTargetRect(
        new DOMRect(
          rect.left - SPOTLIGHT_PADDING,
          rect.top - SPOTLIGHT_PADDING,
          rect.width + SPOTLIGHT_PADDING * 2,
          rect.height + SPOTLIGHT_PADDING * 2,
        ),
      );
    };

    // First measure immediately, then re-measure after scroll settles
    measure();
    const t = setTimeout(measure, 300);
    return () => clearTimeout(t);
  }, [isActive, currentTarget, stepIndex]);

  // Re-measure on window resize
  useEffect(() => {
    if (!isActive) return;
    const onResize = () => {
      if (!currentTarget) return;
      const el = document.querySelector<HTMLElement>(currentTarget);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setTargetRect(
        new DOMRect(
          rect.left - SPOTLIGHT_PADDING,
          rect.top - SPOTLIGHT_PADDING,
          rect.width + SPOTLIGHT_PADDING * 2,
          rect.height + SPOTLIGHT_PADDING * 2,
        ),
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isActive, currentTarget]);

  if (!mounted) return null;

  const step = sidebarTourSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const progressPct = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <>
      {/* Welcome modal */}
      {isWelcomeOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guided-tour-welcome-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.3)]">
              {/* Decorative icon */}
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/12 text-[var(--accent)]">
                <Sparkles className="size-6" aria-hidden />
              </div>

              <h2
                id="guided-tour-welcome-title"
                className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl"
              >
                Welcome to the Cornerstone Demo
              </h2>
              <p className="mt-3 text-[var(--muted)] leading-relaxed">
                This walkthrough will show you how maintenance teams manage
                operations in Cornerstone.
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--accent)]">
                Estimated time: 2 minutes
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={startTour}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3.5 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                >
                  <Sparkles className="h-5 w-5" aria-hidden />
                  Start Guided Tour
                </button>
                <button
                  type="button"
                  onClick={dismissWelcome}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3.5 text-base font-semibold text-[var(--foreground)] hover:border-[var(--accent)]/50 hover:bg-[var(--background)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                >
                  Skip Tour
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Tour overlay — spotlight + step card */}
      {isActive &&
        step &&
        createPortal(
          <div
            className="fixed inset-0 z-[9990] pointer-events-auto"
            aria-modal="true"
            role="dialog"
            aria-labelledby="guided-tour-step-title"
            aria-describedby="guided-tour-step-content"
          >
            {/* Skip button — top right */}
            <div className="fixed right-4 top-4 z-[9995] pointer-events-auto">
              <button
                type="button"
                onClick={skipTour}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card)]/95 px-3 py-2 text-sm font-medium text-[var(--muted)] shadow-[var(--shadow-soft)] hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors"
                aria-label="Skip tour"
              >
                Skip
              </button>
            </div>

            {/* Backdrop + spotlight cutout */}
            {targetRect && (
              <div
                aria-hidden
                className="pointer-events-none fixed"
                style={{
                  left: targetRect.left,
                  top: targetRect.top,
                  width: targetRect.width,
                  height: targetRect.height,
                  background: "transparent",
                  boxShadow: `0 0 0 3px var(--accent), 0 0 0 9999px rgba(0,0,0,0.62)`,
                  borderRadius: "10px",
                  zIndex: 9991,
                }}
              />
            )}

            {/* Step card */}
            <div
              className="fixed z-[9992] pointer-events-auto"
              style={getStepCardPosition(targetRect)}
            >
              <div className="w-full max-w-[20rem] rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.22),0_0_0_1px_rgba(15,23,42,0.05)] p-5">
                {/* Progress bar + counter */}
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--background)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[var(--muted)] tabular-nums">
                    Step {stepIndex + 1} of {totalSteps}
                  </span>
                </div>

                <h2
                  id="guided-tour-step-title"
                  className="text-base font-semibold tracking-tight text-[var(--foreground)]"
                >
                  {step.title}
                </h2>
                <p
                  id="guided-tour-step-content"
                  className="mt-2 text-sm leading-relaxed text-[var(--muted)]"
                >
                  {step.content}
                </p>

                {/* Controls */}
                <div className="mt-5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={isFirst}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3.5 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)]/80 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    aria-label="Previous step"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(59,130,246,0.38)] hover:bg-[var(--accent-hover)] transition-colors"
                    aria-label={isLast ? "Finish tour" : "Next step"}
                  >
                    {isLast ? "Finish" : "Next"}
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Completion modal */}
      {isCompletionOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guided-tour-completion-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.3)]">
              {/* Success icon */}
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <MapPin className="size-6" aria-hidden />
              </div>

              <h2
                id="guided-tour-completion-title"
                className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl"
              >
                You&apos;re ready to explore Cornerstone
              </h2>
              <p className="mt-3 text-[var(--muted)] leading-relaxed">
                This demo shows how maintenance teams manage work orders,
                assets, technicians, inventory, and purchasing in one platform.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/signup"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3.5 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={closeCompletion}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3.5 text-base font-semibold text-[var(--foreground)] hover:border-[var(--accent)]/50 hover:bg-[var(--background)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                >
                  Continue Exploring
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Positions the step card to the right of the target element on desktop,
 * and vertically centered near the bottom on mobile.
 */
function getStepCardPosition(targetRect: DOMRect | null): CSSProperties {
  if (typeof window === "undefined") {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const isMobile = vw < 768;

  if (!targetRect || isMobile) {
    // Mobile: pin to bottom center
    return {
      left: VIEWPORT_PADDING,
      right: VIEWPORT_PADDING,
      bottom: VIEWPORT_PADDING + 16,
      top: "auto",
      width: "auto",
      maxWidth: `${CARD_WIDTH}px`,
      marginLeft: "auto",
      marginRight: "auto",
    };
  }

  // Desktop: position to the right of the sidebar item
  const spaceRight = vw - targetRect.right - SIDEBAR_GAP;
  const cardFitsRight = spaceRight >= CARD_WIDTH + VIEWPORT_PADDING;

  let left: number;
  let right: number | undefined;

  if (cardFitsRight) {
    left = targetRect.right + SIDEBAR_GAP;
    right = undefined;
  } else {
    // Fallback: show below target, left-aligned
    left = Math.max(VIEWPORT_PADDING, targetRect.left);
    right = undefined;
  }

  // Vertically align with target, clamped to viewport
  let top = Math.max(
    VIEWPORT_PADDING,
    targetRect.top + targetRect.height / 2 - CARD_HEIGHT_ESTIMATE / 2,
  );
  if (top + CARD_HEIGHT_ESTIMATE > vh - VIEWPORT_PADDING) {
    top = vh - CARD_HEIGHT_ESTIMATE - VIEWPORT_PADDING;
  }

  return {
    left,
    right,
    top,
    width: CARD_WIDTH,
    transform: "none",
  };
}
