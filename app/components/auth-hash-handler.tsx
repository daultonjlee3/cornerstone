"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

/**
 * When Supabase redirects after magic link (or similar), it often sends users to the Site URL
 * with tokens in the hash (e.g. /#access_token=...&refresh_token=...). The server never sees
 * the hash, so /auth/callback is never hit. This component runs on the client, detects that
 * hash, sets the session via setSession, then redirects to the app.
 * Does nothing when there is no auth hash. Safe to mount in the root layout.
 */
export function AuthHashHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || typeof window === "undefined") return;
    const hash = window.location.hash?.replace(/^#/, "") || "";
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    // Supabase magic link / recovery redirects put tokens in the hash
    if (!accessToken || !refreshToken) return;
    if (type !== "magiclink" && type !== "recovery" && type !== "signup") return;

    handled.current = true;

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          handled.current = false;
          return;
        }
        // Prefer ?next= (e.g. demo deep link) when Supabase lands on site root with hash tokens.
        let next = "/operations";
        try {
          const url = new URL(window.location.href);
          const q = url.searchParams.get("next");
          if (q && q.startsWith("/")) next = q;
        } catch {
          /* keep default */
        }
        window.history.replaceState(null, "", next);
        router.replace(next);
      })
      .catch(() => {
        handled.current = false;
      });
  }, [router, pathname]);

  return null;
}
