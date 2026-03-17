"use client";

import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTour } from "./TourContext";

const CARD_HEIGHT_ESTIMATE = 260;
const VIEWPORT_PADDING = 16;

/** Spotlight overlay and step card. Renders via portal when a tour is active. */
export function TourOverlay() {
  const {
    activeTour,
    stepIndex,
    stepCount,
    targetRect,
    next,
    back,
    skip,
  } = useTour();

  if (!activeTour || typeof document === "undefined") return null;

  const step = activeTour.steps[stepIndex];
  if (!step) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === stepCount - 1;
  const progressPct = stepCount > 0 ? ((stepIndex + 1) / stepCount) * 100 : 0;
  const nextLabel = step.cta ?? (isLast ? "Finish Tour" : "Next");

  const overlay = (
    <div
      className="fixed inset-0 z-[200] pointer-events-auto"
      aria-modal="true"
      role="dialog"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-content"
    >
      {/* Skip — top right, subtle */}
      <div className="fixed right-4 top-4 z-[202] pointer-events-auto">
        <button
          type="button"
          onClick={skip}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)]/95 px-3 py-2 text-sm font-medium text-[var(--muted)] shadow-[var(--shadow-soft)] hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Skip tour"
        >
          Skip
        </button>
      </div>

      {/* Backdrop with spotlight cutout */}
      {targetRect && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
            background: "transparent",
            boxShadow: `0 0 0 2px var(--accent), 0 0 0 9999px rgba(0,0,0,0.6)`,
            borderRadius: "12px",
          }}
        />
      )}

      {/* Step card — polished B2B style; responsive padding on small screens */}
      <div
        className="fixed z-[201] w-full max-w-[28rem] px-4 pointer-events-auto"
        style={getStepCardPosition(targetRect)}
      >
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.2),0_0_0_1px_rgba(15,23,42,0.06)] p-5 sm:p-6">
          {/* Progress bar */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--background)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-[var(--muted)] tabular-nums">
              {stepIndex + 1} of {stepCount}
            </span>
          </div>

          <h2
            id="tour-step-title"
            className="text-lg font-semibold tracking-tight text-[var(--foreground)]"
          >
            {step.title}
          </h2>
          <p
            id="tour-step-content"
            className="mt-2 text-[15px] leading-relaxed text-[var(--muted)]"
          >
            {step.content}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={back}
                disabled={isFirst}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)]/80 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                aria-label="Previous step"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:bg-[var(--accent-hover)] transition-colors"
                aria-label={isLast ? "Finish tour" : "Next step"}
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function getStepCardPosition(targetRect: DOMRect | null): CSSProperties {
  const gap = 12;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const maxTop = VIEWPORT_PADDING;
  const maxBottom = vh - CARD_HEIGHT_ESTIMATE - VIEWPORT_PADDING;

  if (!targetRect) {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  // If target is large (e.g. whole dashboard), pin card to a visible spot so it never goes off-screen.
  const targetHeight = targetRect.height;
  const targetTooTall = targetHeight > vh * 0.5;

  if (targetTooTall) {
    // Pin to bottom of viewport, centered horizontally
    return {
      left: VIEWPORT_PADDING,
      right: VIEWPORT_PADDING,
      bottom: VIEWPORT_PADDING,
      top: "auto",
      marginLeft: "auto",
      marginRight: "auto",
      maxWidth: "min(24rem, 100%)",
    };
  }

  const spaceBelow = vh - targetRect.bottom;
  const showAbove = spaceBelow < CARD_HEIGHT_ESTIMATE + gap && targetRect.top > CARD_HEIGHT_ESTIMATE + gap;

  if (showAbove) {
    const bottom = vh - targetRect.top + gap;
    const clampedBottom = Math.min(bottom, vh - VIEWPORT_PADDING - CARD_HEIGHT_ESTIMATE);
    return {
      left: Math.max(VIEWPORT_PADDING, targetRect.left),
      right: Math.max(VIEWPORT_PADDING, vw - targetRect.right),
      bottom: clampedBottom,
      top: "auto",
      transform: "none",
      marginLeft: "auto",
      marginRight: "auto",
      maxWidth: "min(24rem, 100%)",
    };
  }

  let top = targetRect.bottom + gap;
  if (top > maxBottom) top = maxBottom;
  if (top < maxTop) top = maxTop;

  return {
    left: Math.max(VIEWPORT_PADDING, targetRect.left),
    right: Math.max(VIEWPORT_PADDING, vw - targetRect.right),
    top,
    transform: "none",
    marginLeft: "auto",
    marginRight: "auto",
    maxWidth: "min(24rem, 100%)",
  };
}
