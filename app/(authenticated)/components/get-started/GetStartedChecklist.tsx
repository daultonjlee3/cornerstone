"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronUp,
  X,
  Package,
  ClipboardList,
  UserPlus,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { useGetStartedOnboarding } from "@/hooks/useGetStartedOnboarding";
import { useIsLg } from "@/src/lib/use-media-query";
import Link from "next/link";
import { ResponsiveOverlayPanel } from "@/src/components/ui/panels/ResponsiveOverlayPanel";

const STEPS = [
  {
    id: "asset",
    label: "Create Asset",
    href: "/assets?guide=create-asset",
    icon: Package,
  },
  {
    id: "work-order",
    label: "Create Work Order",
    href: "/work-orders?new=1&guide=create-work-order",
    icon: ClipboardList,
  },
  {
    id: "assign",
    label: "Assign Technician",
    href: "/dispatch?guide=assign",
    icon: UserPlus,
  },
  {
    id: "complete",
    label: "Complete Work Order",
    href: "/work-orders?guide=complete",
    icon: CheckSquare,
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function stepComplete(
  id: StepId,
  checklist: ReturnType<typeof useGetStartedOnboarding>["checklist"]
): boolean {
  switch (id) {
    case "asset":
      return checklist.hasCreatedAsset;
    case "work-order":
      return checklist.hasCreatedWorkOrder;
    case "assign":
      return checklist.hasAssignedTechnician;
    case "complete":
      return checklist.hasCompletedWorkOrder;
    default:
      return false;
  }
}

export function GetStartedChecklist() {
  const router = useRouter();
  const isLg = useIsLg();
  const {
    checklist,
    skipped,
    completedAt,
    allComplete,
    loading,
    markSkipped,
    resumeOnboarding,
  } = useGetStartedOnboarding();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dismissedSuccess, setDismissedSuccess] = useState(false);

  if (loading || skipped) return null;

  const showSuccessCard = allComplete && !dismissedSuccess;
  const hideAll = allComplete && dismissedSuccess;

  const handleStepClick = (href: string) => {
    if (!isLg) setSheetOpen(false);
    router.push(href);
  };

  const listContent = (
    <ul className="space-y-1">
      {STEPS.map((step) => {
        const done = stepComplete(step.id, checklist);
        const Icon = step.icon;
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => handleStepClick(step.href)}
              className="flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--background)]/80"
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden />
              )}
              <Icon className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
              <span className={done ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"}>
                {step.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const header = (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Get started</h2>
      </div>
      <button
        type="button"
        onClick={markSkipped}
        className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
        aria-label="Skip onboarding"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const skipFooter = (
    <div className="border-t border-[var(--card-border)] px-4 py-2">
      <button
        type="button"
        onClick={markSkipped}
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        Skip for now
      </button>
    </div>
  );

  if (showSuccessCard) {
    if (isLg) {
      return (
        <div className="fixed bottom-6 right-6 z-40 w-72 rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-lg">
          <div className="p-4">
            <h3 className="font-semibold text-[var(--foreground)]">You're up and running</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              You've completed your first maintenance workflow.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/operations"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Continue exploring
              </Link>
              <Link
                href="/work-orders?new=1"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--card-border)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
              >
                Create more work
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setDismissedSuccess(true)}
              className="mt-3 w-full text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveOverlayPanel zIndexClassName="z-40">
        <div className="p-4">
          <h3 className="font-semibold text-[var(--foreground)]">You're up and running</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            You've completed your first maintenance workflow.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/operations"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Continue exploring
            </Link>
            <Link
              href="/work-orders?new=1"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--card-border)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              Create more work
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setDismissedSuccess(true)}
            className="mt-3 w-full text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Dismiss
          </button>
        </div>
      </ResponsiveOverlayPanel>
    );
  }

  if (isLg) {
    return (
      <div className="fixed bottom-6 right-6 z-40 w-72 rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-lg">
        {header}
        <div className="max-h-64 overflow-y-auto p-3">{listContent}</div>
        {skipFooter}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex min-h-[48px] items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card)] px-4 shadow-lg"
        aria-label="Open get started checklist"
      >
        <Sparkles className="h-5 w-5 text-[var(--accent)]" aria-hidden />
        <span className="text-sm font-medium text-[var(--foreground)]">Get started</span>
        <ChevronUp className="h-4 w-4 text-[var(--muted)]" aria-hidden />
      </button>

      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden
            onClick={() => setSheetOpen(false)}
          />
          <ResponsiveOverlayPanel zIndexClassName="z-50">
            {header}
            <div className="max-h-60 overflow-y-auto p-3">{listContent}</div>
            {skipFooter}
          </ResponsiveOverlayPanel>
        </>
      )}
    </>
  );
}
