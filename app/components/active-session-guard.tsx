"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { SESSION_REPLACED_LOGIN_REASON } from "@/src/lib/auth/single-session";

const POLL_MS = 45_000;

/**
 * Signs the user out locally when their session was replaced by a login on another device.
 */
export function ActiveSessionGuard() {
  const checking = useRef(false);

  useEffect(() => {
    async function checkSession() {
      if (checking.current) return;
      checking.current = true;
      try {
        const res = await fetch("/api/auth/session-check", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as { valid?: boolean; reason?: string };
        if (body.valid) return;

        if (body.reason === SESSION_REPLACED_LOGIN_REASON) {
          const supabase = createClient();
          await supabase.auth.signOut();
          window.location.replace(`/login?reason=${SESSION_REPLACED_LOGIN_REASON}`);
        }
      } catch {
        // Ignore transient network errors; middleware catches stale sessions on navigation.
      } finally {
        checking.current = false;
      }
    }

    void checkSession();

    const interval = window.setInterval(() => {
      void checkSession();
    }, POLL_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
