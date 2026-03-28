"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

const btnClass =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-opacity hover:bg-[var(--accent-hover)] disabled:pointer-events-none disabled:opacity-60";

type DemoStartFreeTrialButtonProps = {
  className?: string;
};

/**
 * Demo workspace CTA → always `/signup` (middleware allows authenticated users when `source=demo`).
 */
export function DemoStartFreeTrialButton({ className = "" }: DemoStartFreeTrialButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);

  const handleClick = useCallback(() => {
    const returnPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : pathname || "/operations";
    console.log("[demo-workspace] Start Free Trial clicked → /signup", {
      pathname,
      returnPath,
    });

    const params = new URLSearchParams();
    params.set("source", "demo");
    params.set("from", "demo-workspace");
    if (returnPath && returnPath !== "/") {
      params.set("returnTo", returnPath);
    }

    setNavigating(true);
    router.push(`/signup?${params.toString()}`);
  }, [pathname, router]);

  return (
    <button
      type="button"
      disabled={navigating}
      onClick={handleClick}
      className={`${btnClass} ${className}`.trim()}
      aria-busy={navigating}
    >
      <Sparkles className="size-4 shrink-0" aria-hidden />
      {navigating ? "Loading…" : "Start Free Trial"}
    </button>
  );
}
