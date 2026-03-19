"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { DEMO_STEPS, type DemoScenarioStep } from "@/src/lib/demo-scenario/steps";
import { useDemoScenario } from "@/hooks/useDemoScenario";
import { PostDemoOverlay } from "./PostDemoOverlay";
import { ResponsiveOverlayPanel } from "@/src/components/ui/panels/ResponsiveOverlayPanel";

type Rect = { left: number; top: number; width: number; height: number };

function unionRect(rects: DOMRect[]): Rect | null {
  if (!rects.length) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

export function DemoScenarioOverlay() {
  const pathname = usePathname();
  const {
    isDemoMode,
    isIntroOpen,
    stepIndex,
    stepKey,
    scenarioCtx,
    stepError,
    isStarting,
    exploreMode,
    startDemo,
    nextStep,
    restartDemo,
  } = useDemoScenario();

  const step: DemoScenarioStep = useMemo(() => {
    return DEMO_STEPS.find((s) => s.key === stepKey) ?? DEMO_STEPS[0];
  }, [stepKey]);

  const targetSelectors = useMemo(() => {
    if (!scenarioCtx || !step.target) return [];
    const t = step.target(scenarioCtx);
    return t?.selectors ?? [];
  }, [scenarioCtx, step]);

  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!isDemoMode) return;
    if (typeof document === "undefined") return;
    if (!targetSelectors.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetRect(null);
      return;
    }

    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const elements = targetSelectors
        .map((sel) => document.querySelector<HTMLElement>(sel))
        .filter((el): el is HTMLElement => !!el);

      if (!elements.length) {
        setTargetRect(null);
        return;
      }

      const rects = elements.map((el) => el.getBoundingClientRect());
      const u = unionRect(rects);
      setTargetRect(u);
      // Nudge the first matched element toward the middle of the viewport.
      elements[0]?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    };

    // Give route-driven DOM changes a brief moment.
    const t = window.setTimeout(() => {
      requestAnimationFrame(measure);
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [isDemoMode, pathname, targetSelectors, stepIndex]);

  // When on final step, show dedicated post-demo overlay instead of step card.
  if (stepKey === "final" && !exploreMode) {
    return <PostDemoOverlay />;
  }

  if (!isDemoMode) return null;

  const isFinal = step.key === "final";
  const isIntro = step.key === "intro";

  const progressLabel = step.key === "final" ? `${DEMO_STEPS.length - 1}/${DEMO_STEPS.length - 1}` : `${stepIndex}/${DEMO_STEPS.length - 1}`;

  const startButton = (
    <button
      type="button"
      onClick={startDemo}
      disabled={isStarting}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)] disabled:opacity-60"
    >
      {isStarting ? "Loading demo…" : stepError ? "Try again" : (step.primaryAction?.label ?? "Start Demo")}
      {!isIntro ? null : <ArrowRight className="h-5 w-5" aria-hidden />}
    </button>
  );

  const nextButton = (
    <button
      type="button"
      onClick={nextStep}
      disabled={isStarting || isIntro}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)] disabled:opacity-60"
    >
      {step.primaryAction?.label ?? "Next"}
      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );

  const overlay = (
    <div className="fixed inset-0 z-[9999]">
      {/* Spotlight backdrop: darkest at the edges, transparent around the active target. */}
      <div
        className="fixed inset-0 z-[9999] transition-opacity duration-200"
        aria-hidden
        style={
          targetRect
            ? (() => {
                const cx = targetRect.left + targetRect.width / 2;
                const cy = targetRect.top + targetRect.height / 2;
                return {
                  background: `radial-gradient(circle at ${cx}px ${cy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.6) 100%)`,
                };
              })()
            : { background: "rgba(0,0,0,0.55)" }
        }
      />

      {/* Active target ring + soft glow. */}
      {targetRect ? (
        <div
          className="fixed z-[10000] pointer-events-none"
          style={{
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            background: "transparent",
            borderRadius: 12,
            boxShadow: `0 0 0 2px var(--accent), 0 0 0 10px rgba(59,130,246,0.18), 0 18px 50px rgba(0,0,0,0.35)`,
            transition: "all 180ms ease",
          }}
        />
      ) : null}

      {/* Floating restart (hidden on mobile to avoid overlap with the bottom sheet) */}
      <div className="hidden md:block fixed bottom-4 right-6 z-[10000]">
        <button
          type="button"
          onClick={restartDemo}
          className="min-h-[44px] rounded-xl border border-[var(--card-border)] bg-[var(--card)]/95 px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--background)]"
        >
          Demo Guide
        </button>
      </div>

      {/* Step panel: always clamped within viewport (mobile bottom sheet, tablet slide-over, desktop right panel). */}
      <ResponsiveOverlayPanel zIndexClassName="z-[10001]">
        <div key={`${step.key}-${stepIndex}`} className="min-w-0 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)] sm:text-xl">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{step.content}</p>
            </div>
            <div className="shrink-0 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              {progressLabel}
            </div>
          </div>

          {stepError ? (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
              {stepError}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {isFinal ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)]"
                  >
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link
                    href="/operations"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-5 py-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)]"
                  >
                    Explore the App
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  Want another walkthrough? Use <span className="font-semibold">Demo Guide</span> to restart.
                </p>
              </>
            ) : isIntroOpen ? (
              startButton
            ) : (
              nextButton
            )}
          </div>

        </div>
      </ResponsiveOverlayPanel>
    </div>
  );

  return createPortal(overlay, document.body);
}

