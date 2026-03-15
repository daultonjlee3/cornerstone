import Link from "next/link";
import { CalendarCheck, LayoutGrid, Users } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in | Cornerstone OS",
  description: "Sign in to Cornerstone OS — The Operations System for Maintenance Teams",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col lg:flex-row lg:items-start">
      {/* Left panel: brand + value prop — scrollable on mobile/tablet; top-aligned with right on desktop */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-center px-5 py-10 sm:px-6 sm:py-12 md:py-14 lg:max-h-none lg:justify-start lg:px-14 lg:pt-16 lg:pb-16 xl:px-20 xl:pt-20 xl:pb-20">
        {/* Navy → indigo gradient with depth */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0c1222] via-[#132043] to-[#1e1b4b]"
          aria-hidden
        />
        {/* Subtle plus-sign / grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 18h-6v-6h-4v6H4v4h6v6h4v-6h6v-4z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />
        <div className="relative z-10 max-w-md overflow-y-auto lg:overflow-visible">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
            Cornerstone OS
          </h1>
          <p className="mt-3 text-lg font-medium tracking-tight text-slate-200 sm:mt-4 sm:text-xl lg:text-2xl">
            The Operations System for Maintenance Teams
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400 sm:mt-5 sm:text-base">
            Run your entire maintenance operation from one platform.
          </p>
          <p className="mt-3 text-xs font-medium text-slate-400 sm:mt-4 sm:text-sm">
            Built for facilities teams, property maintenance teams, and operations leaders.
          </p>
          <ul className="mt-10 space-y-7 sm:mt-12 sm:space-y-8 lg:mt-14">
            <li className="flex items-start gap-4 sm:gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200 ring-1 ring-white/5 sm:h-[3.25rem] sm:w-[3.25rem]">
                <LayoutGrid className="h-6 w-6 sm:h-[1.4rem] sm:w-[1.4rem]" aria-hidden />
              </span>
              <div className="min-w-0">
                <span className="font-bold text-white">Asset Lifecycle & Equipment Tracking</span>
                <p className="mt-1 text-sm leading-relaxed text-slate-400 sm:mt-1.5">
                  Full visibility from install to retirement.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4 sm:gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200 ring-1 ring-white/5 sm:h-[3.25rem] sm:w-[3.25rem]">
                <CalendarCheck className="h-6 w-6 sm:h-[1.4rem] sm:w-[1.4rem]" aria-hidden />
              </span>
              <div className="min-w-0">
                <span className="font-bold text-white">Preventive Maintenance Automation</span>
                <p className="mt-1 text-sm leading-relaxed text-slate-400 sm:mt-1.5">
                  Schedules, templates, and compliance in one place.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4 sm:gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200 ring-1 ring-white/5 sm:h-[3.25rem] sm:w-[3.25rem]">
                <Users className="h-6 w-6 sm:h-[1.4rem] sm:w-[1.4rem]" aria-hidden />
              </span>
              <div className="min-w-0">
                <span className="font-bold text-white">Dispatch & Technician Workflows</span>
                <p className="mt-1 text-sm leading-relaxed text-slate-400 sm:mt-1.5">
                  Assign, schedule, and track work in the field.
                </p>
              </div>
            </li>
          </ul>
          <p className="mt-8 text-sm text-slate-500 sm:mt-10">
            Trusted by maintenance teams managing thousands of assets and work orders.
          </p>
        </div>
      </div>

      {/* Right panel: login form card — top-aligned with left on desktop, same start padding so content lines up */}
      <div className="flex min-h-0 flex-1 shrink-0 items-center justify-center bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12 md:py-14 lg:items-start lg:justify-start lg:px-14 lg:pt-16 lg:pb-16 xl:px-20 xl:pt-20 xl:pb-20">
        <div className="w-full max-w-[420px] pb-[env(safe-area-inset-bottom)] lg:pb-0">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_32px_64px_-12px_rgba(15,23,42,0.2),0_0_0_1px_rgba(15,23,42,0.04)] transition-shadow duration-200 dark:border-slate-600 dark:bg-slate-800/95 dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)] sm:p-9 lg:p-11">
            <div className="mb-7 sm:mb-9">
              <Link
                href="/"
                className="text-sm font-semibold uppercase tracking-wider text-slate-600 transition-colors hover:text-[var(--accent)] dark:text-slate-300 dark:hover:text-slate-100"
              >
                Cornerstone OS
              </Link>
              <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:mt-6 sm:text-2xl">
                Sign in to Cornerstone OS
              </h2>
              <p className="mt-1.5 text-[15px] text-slate-600 dark:text-slate-300 sm:mt-2">
                Enter your credentials to access your account
              </p>
            </div>
            <LoginForm next={next} />
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-[var(--muted)] sm:mt-8">
            By signing in, you agree to our{" "}
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
