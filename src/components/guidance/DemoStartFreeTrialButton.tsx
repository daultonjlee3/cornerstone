"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

const btnClass =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-opacity hover:bg-[var(--accent-hover)] disabled:pointer-events-none disabled:opacity-60";

type DemoStartFreeTrialButtonProps = {
  className?: string;
};

/**
 * Demo workspace CTA: signup when logged out, onboarding wizard when logged in.
 * (Middleware redirects authenticated users away from /signup, so we branch here.)
 */
export function DemoStartFreeTrialButton({ className = "" }: DemoStartFreeTrialButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);

  const handleClick = useCallback(async () => {
    const returnPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : pathname || "/operations";
    console.log("[demo-workspace] Start Free Trial clicked", {
      pathname,
      returnPath,
    });

    setNavigating(true);
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.warn("[demo-workspace] Start Free Trial: getUser error", error.message);
      }

      const params = new URLSearchParams();
      params.set("source", "demo");
      params.set("from", "demo-workspace");
      if (returnPath && returnPath !== "/") {
        params.set("returnTo", returnPath);
      }

      if (user) {
        console.log("[demo-workspace] Start Free Trial: authenticated → /onboarding-wizard", {
          userId: user.id,
        });
        router.push(`/onboarding-wizard?${params.toString()}`);
      } else {
        console.log("[demo-workspace] Start Free Trial: not authenticated → /signup");
        router.push(`/signup?${params.toString()}`);
      }
    } catch (e) {
      console.error("[demo-workspace] Start Free Trial: navigation failed", e);
      setNavigating(false);
    }
  }, [pathname, router]);

  return (
    <button
      type="button"
      disabled={navigating}
      onClick={() => void handleClick()}
      className={`${btnClass} ${className}`.trim()}
      aria-busy={navigating}
    >
      <Sparkles className="size-4 shrink-0" aria-hidden />
      {navigating ? "Loading…" : "Start Free Trial"}
    </button>
  );
}
