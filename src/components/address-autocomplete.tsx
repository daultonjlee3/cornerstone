"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AddressSuggestion = {
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  place_name: string;
};

type MapboxFeature = {
  place_name?: string;
  center?: [number, number];
  geometry?: { type?: string; coordinates?: [number, number] };
  address?: string;
  text?: string;
  context?: Array<{ id: string; text: string }>;
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

function parseFeature(f: MapboxFeature): AddressSuggestion | null {
  const coords = f?.center?.length === 2 ? f.center : f?.geometry?.coordinates?.length === 2 ? f.geometry.coordinates : null;
  if (!coords) return null;
  const [longitude, latitude] = coords;
  const ctx = (f.context ?? []).reduce(
    (acc, c) => {
      const id = (c.id ?? "").toLowerCase();
      if (id.startsWith("region")) acc.region = c.text;
      else if (id.startsWith("place")) acc.place = c.text;
      else if (id.startsWith("postcode")) acc.postcode = c.text;
      else if (id.startsWith("country")) acc.country = c.text;
      return acc;
    },
    {} as { region?: string; place?: string; postcode?: string; country?: string }
  );
  const addressLine1 = [f.address, f.text].filter(Boolean).join(" ").trim()
    || (f.place_name ?? "").split(",")[0]?.trim()
    || null;
  return {
    address_line1: addressLine1,
    city: ctx.place ?? null,
    state: ctx.region ?? null,
    postal_code: ctx.postcode ?? null,
    country: ctx.country ?? null,
    latitude,
    longitude,
    place_name: f.place_name ?? "",
  };
}

const MIN_QUERY_LENGTH = 3;

async function fetchSuggestions(query: string, token: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < MIN_QUERY_LENGTH) return [];
  const url = new URL(
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(q) + ".json"
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("types", "address,place");
  url.searchParams.set("limit", "5");
  const urlStr = url.toString();
  const res = await fetch(urlStr);
  let data: MapboxResponse & { message?: string };
  try {
    data = (await res.json()) as MapboxResponse & { message?: string };
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = data?.message ?? res.statusText;
    console.error("[AddressAutocomplete] Mapbox request failed:", res.status, msg, urlStr.replace(token, "***"));
    if (res.status === 401) {
      console.warn(
        "[AddressAutocomplete] 401 Invalid Token: Check (1) token in .env.local matches https://account.mapbox.com/access-tokens/ , " +
        "(2) if URL restrictions are set, add http://localhost:3000 and your production URL, (3) token has Geocoding scope."
      );
    }
    return [];
  }
  const out: AddressSuggestion[] = [];
  for (const f of data.features ?? []) {
    const parsed = parseFeature(f);
    if (parsed) out.push(parsed);
  }
  return out;
}

type AddressAutocompleteProps = {
  onSelect: (address: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** When provided (e.g. from server), token is used as fallback; client prefers NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN. */
  mapboxToken?: string | null;
};

// Client-side: use only NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN (inlined at build). No MAPBOX_ACCESS_TOKEN on client.
function getClientMapboxToken(): string | null {
  if (typeof window === "undefined") return null;
  const t = (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "").trim();
  return t || null;
}

export function AddressAutocomplete({
  onSelect,
  placeholder = "Search for an address…",
  className = "",
  disabled = false,
  mapboxToken: mapboxTokenProp,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const tokenFromEnv = getClientMapboxToken();
  const tokenFromProp = (mapboxTokenProp ?? "").trim() || null;
  const initialToken = tokenFromEnv ?? tokenFromProp ?? null;
  const [token, setToken] = useState<string | null>(() => initialToken);
  const tokenRef = useRef<string>(initialToken ?? "");
  const tokenChecked = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  tokenRef.current = token ?? "";

  // Temporary dev log: token prefix and length (never the full token)
  const tokenLoggedRef = useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const t = tokenRef.current;
    if (!t) {
      tokenLoggedRef.current = false;
      return;
    }
    if (tokenLoggedRef.current) return;
    tokenLoggedRef.current = true;
    const prefix = t.length > 12 ? t.substring(0, 12) + "…" : t.substring(0, 12);
    console.log("[AddressAutocomplete] token (dev): prefix=%s, length=%d", prefix, t.length);
  }, [token]);

  // Position dropdown under the input (for portal); use viewport coords for position:fixed
  useLayoutEffect(() => {
    if (!open || suggestions.length === 0) {
      setDropdownRect(null);
      return;
    }
    const input = inputRef.current ?? containerRef.current?.querySelector("input");
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [open, suggestions.length]);

  // Prefer NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN (env), then server-passed prop; skip API when we have either
  useEffect(() => {
    if (tokenFromEnv) {
      setToken(tokenFromEnv);
      tokenRef.current = tokenFromEnv;
      tokenChecked.current = true;
      return;
    }
    if (tokenFromProp) {
      setToken(tokenFromProp);
      tokenRef.current = tokenFromProp;
      tokenChecked.current = true;
      return;
    }
  }, [tokenFromEnv, tokenFromProp]);

  // Fallback: load token from API route only when we have no token; never overwrite a valid pk. token
  useEffect(() => {
    if (tokenChecked.current) return;
    const current = tokenRef.current;
    if (current && current.startsWith("pk.")) {
      tokenChecked.current = true;
      return;
    }
    tokenChecked.current = true;
    const apiUrl =
      (typeof window !== "undefined" ? window.location.origin : "") + "/api/mapbox-token";
    fetch(apiUrl)
      .then((r) => {
        if (!r.ok) {
          console.warn("[AddressAutocomplete] mapbox-token API status:", r.status, r.statusText);
          return { token: null };
        }
        return r.json();
      })
      .then((data: { token?: string | null }) => {
        const value = typeof data?.token === "string" ? data.token.trim() : "";
        const isPublicToken = value.length > 0 && value.startsWith("pk.");
        if (!isPublicToken) return;
        const existing = tokenRef.current;
        if (existing && existing.startsWith("pk.")) return;
        setToken(value);
        tokenRef.current = value;
      })
      .catch((err) => {
        console.warn("[AddressAutocomplete] mapbox-token fetch failed:", err);
      });
  }, []);

  const loadSuggestions = useCallback(async (q: string) => {
    const trimmed = q.trim();
    const t = tokenRef.current;
    if (!t || !trimmed || trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchSuggestions(trimmed, t);
      setSuggestions(list);
      setOpen(list.length > 0);
    } catch (err) {
      console.error("[AddressAutocomplete] Mapbox fetch error:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (q.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      loadSuggestions(q);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, loadSuggestions]);

  // When token first becomes available and user already has a query of min length, run search once
  const tokenWasEmptyRef = useRef(true);
  useEffect(() => {
    const q = query.trim();
    if (token && tokenWasEmptyRef.current && q.length >= MIN_QUERY_LENGTH) {
      tokenWasEmptyRef.current = false;
      loadSuggestions(q);
    }
    if (!token) tokenWasEmptyRef.current = true;
  }, [token, query, loadSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const listbox = document.getElementById("address-autocomplete-listbox");
      if (listbox?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (s: AddressSuggestion) => {
    onSelect(s);
    setQuery(s.place_name);
    setSuggestions([]);
    setOpen(false);
  };

  const hasToken = !!token;

  const dropdownList = open && suggestions.length > 0 && dropdownRect && typeof document !== "undefined" &&
    createPortal(
      <ul
        id="address-autocomplete-listbox"
        role="listbox"
        className="fixed z-[200] max-h-60 w-full overflow-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
        style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }}
      >
        {suggestions.map((s, i) => (
          <li
            key={i}
            role="option"
            tabIndex={0}
            className="cursor-pointer px-3 py-2 text-sm hover:bg-[var(--accent)]/10 focus:bg-[var(--accent)]/10 focus:outline-none"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(s);
            }}
          >
            {s.place_name}
          </li>
        ))}
      </ul>,
      document.body
    );

  return (
    <div ref={containerRef} className="relative space-y-1">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={hasToken ? placeholder : "Type to search (add Mapbox token to enable)"}
        className={className || "ui-input"}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        role="combobox"
      />
      {token === null ? (
        <p className="text-xs text-[var(--muted)]">Loading address search…</p>
      ) : !hasToken ? (
        <p className="text-xs text-[var(--muted)]">
          Address search unavailable. Set <code className="rounded bg-[var(--muted)]/20 px-1">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in{" "}
          <code className="rounded bg-[var(--muted)]/20 px-1">.env.local</code>, then restart the dev server and refresh.{" "}
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline hover:no-underline"
          >
            Get a token
          </a>
        </p>
      ) : null}
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
          Searching…
        </span>
      )}
      {dropdownList}
    </div>
  );
}
