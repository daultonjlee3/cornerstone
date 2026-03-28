"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useTour } from "./TourContext";

const CARD_HEIGHT_ESTIMATE = 260;
const VIEWPORT_PADDING = 16;

const SPOTLIGHT_TRANSITION =
  "left 480ms cubic-bezier(0.33, 1, 0.68, 1), top 480ms cubic-bezier(0.33, 1, 0.68, 1), width 480ms cubic-bezier(0.33, 1, 0.68, 1), height 480ms cubic-bezier(0.33, 1, 0.68, 1), box-shadow 320ms ease";

const CARD_TRANSITION =
  "top 480ms cubic-bezier(0.33, 1, 0.68, 1), left 480ms cubic-bezier(0.33, 1, 0.68, 1), right 480ms cubic-bezier(0.33, 1, 0.68, 1), bottom 480ms cubic-bezier(0.33, 1, 0.68, 1), transform 480ms cubic-bezier(0.33, 1, 0.68, 1)";

/** Spotlight overlay and step card. Renders via portal when a tour is active. */
export function TourOverlay() {
  const router = useRouter();
  const {
    activeTour,
    stepIndex,
    stepCount,
    targetRect,
    next,
    back,
    skip,
    canAdvanceNext,
    dwellSecondsRemaining,
    isTourPaused,
    toggleTourPause,
    replayDemoFromStart,
  } = useTour();

  if (!activeTour || typeof document === "undefined") return null;

  const step = activeTour.steps[stepIndex];
  if (!step) return null;

  const isDemoGuided = activeTour.id === "demo-guided";
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === stepCount - 1;
  const progressPct = stepCount > 0 ? ((stepIndex + 1) / stepCount) * 100 : 0;
  const nextLabel = step.cta ?? (isLast ? "Finish" : "Next");
  const isCtaVariant = step.variant === "cta";
  const hideNav = step.hideNext === true;
  const contentText = step.content?.trim() ?? "";

  const showProductTourNav = !hideNav && !isDemoGuided;
  const showDemoNav = isDemoGuided && !isCtaVariant;
  const nextDisabled = showDemoNav && !canAdvanceNext;

  const cardStyle: CSSProperties = isCtaVariant
    ? { left: "50%", top: "50%", transform: "translate(-50%, -50%)", transition: CARD_TRANSITION }
    : { ...getStepCardPosition(targetRect, isDemoGuided), transition: CARD_TRANSITION };

  const overlay = (
    <div
      className="fixed inset-0 z-[200] pointer-events-none"
      aria-modal="true"
      role="dialog"
      aria-labelledby="tour-step-title"
      aria-describedby={contentText ? "tour-step-content" : undefined}
    >
      <div className="fixed right-4 top-4 z-[202] flex flex-wrap items-center justify-end gap-2 pointer-events-auto">
        {isDemoGuided ? (
          <>
            <button
              type="button"
              onClick={toggleTourPause}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)]/95 px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--background)] transition-colors"
              aria-pressed={isTourPaused}
              aria-label={isTourPaused ? "Resume tour" : "Pause tour"}
            >
              {isTourPaused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
              {isTourPaused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={replayDemoFromStart}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)]/95 px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--background)] transition-colors"
              aria-label="Replay tour from the beginning"
            >
              <RotateCcw className="size-4" aria-hidden />
              Replay
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={skip}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)]/95 px-3 py-2 text-sm font-medium text-[var(--muted)] shadow-[var(--shadow-soft)] hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Skip tour"
        >
          Skip
        </button>
      </div>

      {!isCtaVariant && targetRect && (
        <div
          className="fixed pointer-events-none z-[198]"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
            background: "transparent",
            boxShadow: isDemoGuided
              ? `0 0 0 3px var(--accent), 0 0 0 9999px rgba(15,23,42,0.78)`
              : `0 0 0 2px var(--accent), 0 0 0 9999px rgba(0,0,0,0.6)`,
            borderRadius: "12px",
            transition: SPOTLIGHT_TRANSITION,
          }}
        />
      )}

      {isCtaVariant && (
        <div
          className="fixed inset-0 z-[199] bg-black/65 backdrop-blur-[3px] pointer-events-auto"
          aria-hidden
        />
      )}

      <div
        className={`fixed z-[201] w-full max-w-[26rem] px-4 pointer-events-auto ${isCtaVariant ? "max-w-md" : ""}`}
        style={cardStyle}
      >
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.22),0_0_0_1px_rgba(15,23,42,0.06)] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--background)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-[var(--muted)] tabular-nums">
              {stepIndex + 1} / {stepCount}
            </span>
          </div>

          <h2
            id="tour-step-title"
            className="text-lg font-semibold tracking-tight text-[var(--foreground)] leading-snug"
          >
            {step.title}
          </h2>

          {isDemoGuided && step.actionCta && !isCtaVariant ? (
            <p className="mt-2 text-sm font-medium text-[var(--accent)]">{step.actionCta}</p>
          ) : null}

          {contentText ? (
            <p
              id="tour-step-content"
              className="mt-3 text-[15px] leading-relaxed text-[var(--foreground)]/85"
            >
              {step.content}
            </p>
          ) : null}

          {isTourPaused && isDemoGuided ? (
            <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-400">Tour paused — resume when you are ready.</p>
          ) : null}

          {showDemoNav && nextDisabled && !isTourPaused ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Next unlocks in <span className="font-semibold tabular-nums text-[var(--foreground)]">{dwellSecondsRemaining}s</span> so you can read this step.
            </p>
          ) : null}

          {isCtaVariant ? (
            <div className="mt-6 space-y-3">
              {isDemoGuided ? (
                <button
                  type="button"
                  onClick={back}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)]/80 transition-colors"
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                disabled={isDemoGuided && isTourPaused}
                onClick={() => {
                  next();
                  router.push("/signup?source=demo-90");
                }}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:bg-[var(--accent-hover)] disabled:opacity-45 disabled:pointer-events-none transition-colors"
              >
                {step.actionCta ?? "Start Free Trial"}
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {showDemoNav && (
                <>
                  <button
                    type="button"
                    onClick={back}
                    disabled={isFirst}
                    className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)]/80 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    aria-label="Previous step"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    disabled={nextDisabled || isTourPaused}
                    className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:bg-[var(--accent-hover)] disabled:opacity-45 disabled:pointer-events-none transition-colors"
                    aria-label={isLast ? "Finish tour" : "Next step"}
                  >
                    {nextLabel}
                  </button>
                </>
              )}
              {showProductTourNav && (
                <>
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
                </>
              )}
              {hideNav && !isDemoGuided && (
                <p className="text-sm font-medium text-[var(--muted)]">Follow the highlight to continue.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function getStepCardPosition(targetRect: DOMRect | null, compact: boolean): CSSProperties {
  const gap = 14;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const maxTop = VIEWPORT_PADDING;
  const cardH = compact ? CARD_HEIGHT_ESTIMATE - 30 : CARD_HEIGHT_ESTIMATE;
  const maxBottom = vh - cardH - VIEWPORT_PADDING;

  if (!targetRect) {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  const targetHeight = targetRect.height;
  const targetTooTall = targetHeight > vh * 0.48;

  if (targetTooTall) {
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
  const showAbove = spaceBelow < cardH + gap && targetRect.top > cardH + gap;

  if (showAbove) {
    const bottom = vh - targetRect.top + gap;
    const clampedBottom = Math.min(bottom, vh - VIEWPORT_PADDING - cardH);
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
