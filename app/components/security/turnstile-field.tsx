"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

type TurnstileFieldProps = {
  name?: string;
  className?: string;
  onTokenChange?: (token: string) => void;
  resetKey?: string | number;
};

const SCRIPT_ID = "cf-turnstile-script";

export function TurnstileField({
  name = "turnstile_token",
  className = "",
  onTokenChange,
  resetKey = 0,
}: TurnstileFieldProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const onTokenChangeRef = useRef(onTokenChange);
  onTokenChangeRef.current = onTokenChange;

  useEffect(() => {
    if (!siteKey) return;

    const ensureScript = (): Promise<void> =>
      new Promise((resolve) => {
        if (window.turnstile) {
          resolve();
          return;
        }

        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });

    void ensureScript().then(() => {
      if (!window.turnstile || !containerRef.current) return;
      if (widgetIdRef.current && window.turnstile.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      setToken("");
      onTokenChangeRef.current?.("");
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (nextToken: string) => {
          setToken(nextToken);
          onTokenChangeRef.current?.(nextToken);
        },
        "expired-callback": () => {
          setToken("");
          onTokenChangeRef.current?.("");
        },
        "error-callback": () => {
          setToken("");
          onTokenChangeRef.current?.("");
        },
      });
    });

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, resetKey]);

  if (!siteKey) return null;

  return (
    <div className={className}>
      <div ref={containerRef} />
      <input type="hidden" name={name} value={token} />
    </div>
  );
}
