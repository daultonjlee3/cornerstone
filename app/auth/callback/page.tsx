"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

/**
 * Handles auth redirect after magic link (or OAuth). Exchanges code/session from URL and redirects to app.
 * Supports both PKCE (code in query) and implicit (tokens in hash). Used by the demo entry flow.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const next = searchParams.get("next") || "/operations";
    const code = searchParams.get("code");

    const supabase = createClient();

    if (code) {
      handled.current = true;
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            setStatus("error");
            handled.current = false;
            return;
          }
          setStatus("done");
          router.replace(next.startsWith("/") ? next : "/operations");
        })
        .catch(() => {
          setStatus("error");
          handled.current = false;
        });
      return;
    }

    // Hash-based tokens: Supabase may redirect to this page with #access_token=...&refresh_token=...
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        handled.current = true;
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (error) {
              setStatus("error");
              handled.current = false;
              return;
            }
            setStatus("done");
            window.history.replaceState(null, "", next);
            router.replace(next.startsWith("/") ? next : "/operations");
          })
          .catch(() => {
            setStatus("error");
            handled.current = false;
          });
        return;
      }
    }

    // Already have session (e.g. from cookie)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus("done");
        router.replace(next.startsWith("/") ? next : "/operations");
      } else {
        setStatus("error");
      }
    });
  }, [router, searchParams]);

  if (status === "error") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-[var(--muted)]">Sign-in link invalid or expired.</p>
        <a href="/login" className="text-[var(--accent)] font-medium hover:underline">
          Go to login
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
      <p className="text-[var(--muted)]">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-4">
          <p className="text-[var(--muted)]">Loading…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
