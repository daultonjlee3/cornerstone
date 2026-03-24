import Link from "next/link";
import { CalendarCheck, LayoutGrid, Users } from "lucide-react";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Sign up | Cornerstone OS",
  description: "Create your account — Cornerstone OS, The Operations System for Maintenance Teams",
};

export default function SignupPage({
  searchParams,
}: {
  searchParams?: { source?: string };
}) {
  const source = searchParams?.source === "demo" ? "demo" : "";
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col lg:flex-row lg:items-start">
      {/* Left panel: brand + value prop — matches login */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-center px-5 py-10 sm:px-6 sm:py-12 md:py-14 lg:max-h-none lg:justify-start lg:px-14 lg:pt-16 lg:pb-16 xl:px-20 xl:pt-20 xl:pb-20">
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0c1222] via-[#132043] to-[#1e1b4b]"
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
          aria-hidden
        />
        <div className="relative z-10 max-w-md overflow-y-auto lg:overflow-visible">
          <span
            className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-slate-300"
            aria-hidden
          >
            Modern CMMS Platform
          </span>
          <h1 className="mb-3 mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
            Cornerstone OS
          </h1>
          <p className="mb-[18px] text-lg font-medium tracking-tight text-slate-200 sm:text-xl lg:text-2xl">
            The Operations System for Maintenance Teams
          </p>
          <p className="mb-7 text-[15px] leading-relaxed text-slate-400 sm:text-base">
            Run your entire maintenance operation from one platform.
          </p>
          <p className="text-xs font-medium text-slate-300 sm:text-sm">
            Built for facilities teams, property maintenance teams, and operations leaders.
          </p>
          <ul className="mt-10 space-y-8 sm:mt-12 sm:space-y-10 lg:mt-14">
            <li className="flex items-start gap-4 sm:gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200 ring-1 ring-white/5 sm:h-[3.5rem] sm:w-[3.5rem]">
                <LayoutGrid className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
              </span>
              <div className="min-w-0">
                <span className="font-bold text-white">Asset Lifecycle & Equipment Tracking</span>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  Full visibility from install to retirement.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4 sm:gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200 ring-1 ring-white/5 sm:h-[3.5rem] sm:w-[3.5rem]">
                <CalendarCheck className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
              </span>
              <div className="min-w-0">
                <span className="font-bold text-white">Preventive Maintenance Automation</span>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  Schedules, templates, and compliance in one place.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4 sm:gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200 ring-1 ring-white/5 sm:h-[3.5rem] sm:w-[3.5rem]">
                <Users className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
              </span>
              <div className="min-w-0">
                <span className="font-bold text-white">Dispatch & Technician Workflows</span>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  Assign, schedule, and track work in the field.
                </p>
              </div>
            </li>
          </ul>
          <p className="mt-10 text-sm text-slate-500 sm:mt-12">
            Trusted by maintenance teams managing thousands of assets and work orders.
          </p>
        </div>
      </div>

      {/* Right panel: signup form card — matches login */}
      <div className="flex min-h-0 flex-1 shrink-0 items-center justify-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12 md:py-14 lg:items-start lg:justify-start lg:px-14 lg:pt-16 lg:pb-16 xl:px-20 xl:pt-20 xl:pb-20">
        <div className="w-full max-w-[420px] pb-[env(safe-area-inset-bottom)] lg:pb-0">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_40px_80px_-16px_rgba(15,23,42,0.25),0_0_0_1px_rgba(15,23,42,0.06)] transition-shadow duration-200 dark:border-slate-600 dark:bg-slate-800/95 dark:shadow-[0_40px_80px_-16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)] sm:p-10 lg:p-12">
            <SignupForm source={source} />
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-[var(--muted)] sm:mt-8">
            By creating an account, you agree to our{" "}
            <Link
              href="/terms"
              className="underline decoration-[var(--muted)] underline-offset-2 transition-colors hover:text-[var(--foreground)] hover:decoration-[var(--foreground)]"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline decoration-[var(--muted)] underline-offset-2 transition-colors hover:text-[var(--foreground)] hover:decoration-[var(--foreground)]"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
