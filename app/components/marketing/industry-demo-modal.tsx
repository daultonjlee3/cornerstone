"use client";

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { INDUSTRY_DEMO_OPTIONS, DEMO_ROUTES, ROUTES } from "@/lib/marketing-site";
import { enterDemoAction } from "@/app/demo/actions";
import { ArrowRight, Building2, ChevronLeft, Factory, FileSearch, Heart, LayoutGrid, Mail, Play, Rocket, School, X } from "lucide-react";

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rocket: Rocket,
  play: Play,
  filesearch: FileSearch,
};

const INDUSTRY_ICONS: Record<(typeof INDUSTRY_DEMO_OPTIONS)[number]["id"], React.ComponentType<{ className?: string }>> = {
  "facility-maintenance": Building2,
  industrial: Factory,
  "school-district": School,
  healthcare: Heart,
};

const DEMO_INDUSTRY_IDS = ["facility-maintenance", "industrial", "school-district", "healthcare"] as const;

type IndustryDemoModalContextValue = {
  openModal: () => void;
};

const IndustryDemoModalContext = React.createContext<IndustryDemoModalContextValue | null>(null);

export function useIndustryDemoModal(): IndustryDemoModalContextValue | null {
  return useContext(IndustryDemoModalContext);
}

function IndustryDemoModalContent({
  onClose,
  onSelectIndustryThenEmail,
  onSelectGeneral,
}: {
  onClose: () => void;
  onSelectIndustryThenEmail: (industrySlug: string, industryName: string) => void;
  onSelectGeneral: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<"industry" | "email">("industry");
  const [selectedIndustry, setSelectedIndustry] = useState<{ slug: string; name: string } | null>(null);
  const [state, formAction] = useActionState(enterDemoAction, {});

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (step === "email") setStep("industry");
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (state?.redirectUrl) {
      try {
        const url = new URL(state.redirectUrl);
        const origin = window.location.origin;
        const fixed = `${origin}${url.pathname}${url.search}${url.hash}`;
        window.location.href = fixed;
      } catch {
        window.location.href = state.redirectUrl;
      }
    }
  }, [state?.redirectUrl]);

  // Only industry options from INDUSTRY_DEMO_OPTIONS are passed here. The "Just show me the platform"
  // general option is a separate button that calls onSelectGeneral directly (no route comparison).
  const handleIndustrySelect = useCallback(
    (option: (typeof INDUSTRY_DEMO_OPTIONS)[number]) => {
      if (DEMO_INDUSTRY_IDS.includes(option.id as (typeof DEMO_INDUSTRY_IDS)[number])) {
        setSelectedIndustry({ slug: option.id, name: option.name });
        setStep("email");
      } else {
        onSelectIndustryThenEmail(option.id, option.name);
      }
    },
    [onSelectIndustryThenEmail]
  );

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="industry-demo-modal-title"
      aria-describedby="industry-demo-modal-desc"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => (step === "email" ? setStep("industry") : onClose())}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label={step === "email" ? "Back" : "Close"}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8">
          {step === "industry" ? (
            <>
              <h2
                id="industry-demo-modal-title"
                className="pr-10 text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl"
              >
                Choose your industry to explore the Cornerstone demo
              </h2>
              <p
                id="industry-demo-modal-desc"
                className="mt-2 text-[var(--muted)] sm:text-base"
              >
                Each demo environment is preloaded with realistic maintenance data tailored to your operations.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {INDUSTRY_DEMO_OPTIONS.map((option) => {
                  const Icon = INDUSTRY_ICONS[option.id];
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleIndustrySelect(option)}
                      className="flex min-h-[44px] items-start gap-4 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-[var(--foreground)]">
                          {option.name}
                        </span>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 border-t border-[var(--card-border)] pt-6">
                <button
                  type="button"
                  onClick={onSelectGeneral}
                  className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden />
                  Just show me the platform
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("industry")}
                className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
              <h2
                id="industry-demo-modal-title"
                className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl"
              >
                Launch your live demo
              </h2>
              <p id="industry-demo-modal-desc" className="mt-2 text-[var(--muted)] sm:text-base">
                Enter your work email to explore a Cornerstone OS environment tailored to your industry.
              </p>

              {state?.error && (
                <div
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300"
                  role="alert"
                >
                  {state.error}
                </div>
              )}

              <form action={formAction} className="mt-6 space-y-4">
                <input type="hidden" name="industry_slug" value={selectedIndustry?.slug ?? ""} />
                <div>
                  <label htmlFor="demo-email" className="block text-sm font-semibold text-[var(--foreground)]">
                    Work email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" aria-hidden />
                    <input
                      id="demo-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@company.com"
                      className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] py-3 pl-10 pr-4 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="demo-company" className="block text-sm font-semibold text-[var(--foreground)]">
                    Company name <span className="font-normal text-[var(--muted)]">(optional)</span>
                  </label>
                  <input
                    id="demo-company"
                    name="company_name"
                    type="text"
                    autoComplete="organization"
                    placeholder="Your company"
                    className="mt-1.5 w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] py-3 px-4 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[var(--accent)] px-4 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  Enter Demo
                </button>
              </form>
              <p className="mt-4 text-sm text-[var(--muted)]">
                No scheduling required. Explore a live environment with realistic seeded data.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function IndustryDemoModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  const onSelectGeneral = useCallback(() => {
    closeModal();
    router.push(DEMO_ROUTES.general);
  }, [closeModal, router]);

  const modalEl = open ? (
    <IndustryDemoModalContent
      onClose={closeModal}
      onSelectIndustryThenEmail={() => {}}
      onSelectGeneral={onSelectGeneral}
    />
  ) : null;

  return (
    <IndustryDemoModalContext.Provider value={{ openModal }}>
      {children}
      {typeof document !== "undefined" && modalEl
        ? createPortal(modalEl, document.body)
        : modalEl}
    </IndustryDemoModalContext.Provider>
  );
}

/** Button that opens the industry demo modal (industry selection → email capture → live demo). */
export function SeeHowItWorksButton({
  children = "Try the live demo",
  className = "",
  variant = "secondary",
  onClick,
  "data-testid": dataTestId,
}: {
  children?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  "data-testid"?: string;
}) {
  const ctx = useIndustryDemoModal();

  const baseClass =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl px-6 py-4 text-base font-semibold transition-all duration-200 sm:min-h-[48px]";
  const primaryClass =
    "bg-[var(--accent)] text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)]";
  const secondaryClass =
    "border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]";

  const sharedClass = `${baseClass} ${variant === "primary" ? primaryClass : secondaryClass} ${className}`;

  const testIdProps = dataTestId ? { "data-testid": dataTestId } : {};

  if (!ctx) {
    return (
      <Link href={ROUTES.howItWorks} className={sharedClass} {...testIdProps}>
        {children}
      </Link>
    );
  }

  const handleClick = useCallback(() => {
    onClick?.();
    ctx.openModal();
  }, [onClick, ctx]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={sharedClass}
      {...testIdProps}
    >
      {children}
    </button>
  );
}

/** Card for How It Works page that opens the industry demo modal (same look as a step link). */
export function HowItWorksDemoCard({
  title,
  description,
  iconName,
}: {
  title: string;
  description: string;
  iconName: "rocket" | "play" | "filesearch";
}) {
  const ctx = useIndustryDemoModal();
  const Icon = STEP_ICONS[iconName] ?? Play;
  const cardClass =
    "flex w-full gap-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-left transition-all hover:border-[var(--accent)] hover:shadow-md min-h-[44px]";

  if (ctx) {
    return (
      <button
        type="button"
        onClick={() => ctx.openModal()}
        className={cardClass}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
            {title}
          </h2>
          <p className="mt-2 text-[var(--muted)]">{description}</p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden />
      </button>
    );
  }

  return (
    <Link href={ROUTES.howItWorks} className={cardClass}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          {title}
        </h2>
        <p className="mt-2 text-[var(--muted)]">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden />
    </Link>
  );
}
