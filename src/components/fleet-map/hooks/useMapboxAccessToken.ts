"use client";

import { useEffect, useState } from "react";

export function useMapboxAccessToken(): { token: string | null; loading: boolean; error: string | null } {
  const [token, setToken] = useState<string | null>(() => {
    const env = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
    return env && env.startsWith("pk.") ? env : null;
  });
  const [loading, setLoading] = useState(!token);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/mapbox-token", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { token?: string | null }) => {
        if (cancelled) return;
        const resolved = data.token?.trim() ?? null;
        if (resolved?.startsWith("pk.")) {
          setToken(resolved);
          setError(null);
        } else {
          setError("Mapbox token unavailable. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load Mapbox token");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { token, loading, error };
}
