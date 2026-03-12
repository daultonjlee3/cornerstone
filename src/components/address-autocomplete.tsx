"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  address?: string;
  text?: string;
  context?: Array<{ id: string; text: string }>;
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

function parseFeature(f: MapboxFeature): AddressSuggestion | null {
  if (!f?.center?.length) return null;
  const [longitude, latitude] = f.center;
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
    address_line1,
    city: ctx.place ?? null,
    state: ctx.region ?? null,
    postal_code: ctx.postcode ?? null,
    country: ctx.country ?? null,
    latitude,
    longitude,
    place_name: f.place_name ?? "",
  };
}

async function fetchSuggestions(query: string, token: string): Promise<AddressSuggestion[]> {
  if (!query.trim()) return [];
  const url = new URL(
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(query) + ".json"
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
    console.error("[AddressAutocomplete] Mapbox request failed:", res.status, data?.message ?? res.statusText, urlStr.replace(token, "***"));
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
  /** When provided (e.g. from server), token is used directly and no client fetch is made. */
  mapboxToken?: string | null;
};

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
  const tokenFromProp = (mapboxTokenProp ?? "").trim() || null;
  const [token, setToken] = useState<string | null>(() => tokenFromProp ?? null);
  const tokenRef = useRef<string>(tokenFromProp ?? "");
  const tokenChecked = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  tokenRef.current = token ?? "";

  // If parent passed a token (from server), use it and skip fetch
  useEffect(() => {
    if (tokenFromProp) {
      setToken(tokenFromProp);
      tokenRef.current = tokenFromProp;
      tokenChecked.current = true;
      return;
    }
  }, [tokenFromProp]);

  // Otherwise load token from API route (server reads .env.local)
  useEffect(() => {
    if (tokenChecked.current) return;
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
        setToken(value || "");
        if (value) tokenRef.current = value;
      })
      .catch((err) => {
        console.warn("[AddressAutocomplete] mapbox-token fetch failed:", err);
        setToken("");
      });
  }, []);

  const loadSuggestions = useCallback(async (q: string) => {
    const t = tokenRef.current;
    if (!t || !q.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchSuggestions(q, t);
      setSuggestions(list);
      setOpen(list.length > 0);
      if (typeof window !== "undefined") {
        console.log("[AddressAutocomplete] suggestions count:", list.length);
      }
    } catch (err) {
      console.error("[AddressAutocomplete] Mapbox fetch error:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const q = query.trim();
    debounceRef.current = setTimeout(() => {
      loadSuggestions(q);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, loadSuggestions]);

  // When token first becomes available and user already has a query, run search once
  const tokenWasEmptyRef = useRef(true);
  useEffect(() => {
    if (token && tokenWasEmptyRef.current && query.trim()) {
      tokenWasEmptyRef.current = false;
      loadSuggestions(query.trim());
    }
    if (!token) tokenWasEmptyRef.current = true;
  }, [token, query, loadSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <div ref={containerRef} className="relative space-y-1">
      <input
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
          Address search unavailable. Ensure <code className="rounded bg-[var(--muted)]/20 px-1">MAPBOX_ACCESS_TOKEN</code> or{" "}
          <code className="rounded bg-[var(--muted)]/20 px-1">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> is set in{" "}
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
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
          role="listbox"
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
        </ul>
      )}
    </div>
  );
}
