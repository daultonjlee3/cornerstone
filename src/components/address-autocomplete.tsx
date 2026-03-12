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
  properties?: {
    full_address?: string;
    name?: string;
    place_formatted?: string;
    context?: Record<string, { name?: string; text?: string } | null> | null;
    coordinates?: { longitude?: number; latitude?: number } | null;
  };
  context?: Array<{ id: string; text: string }>;
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

function parseFeature(f: MapboxFeature): AddressSuggestion | null {
  const coords =
    f?.center?.length === 2
      ? f.center
      : f?.geometry?.coordinates?.length === 2
        ? f.geometry.coordinates
        : f?.properties?.coordinates?.longitude != null &&
            f?.properties?.coordinates?.latitude != null
          ? [f.properties.coordinates.longitude, f.properties.coordinates.latitude]
          : null;
  if (!coords) return null;
  const [longitude, latitude] = coords;
  const ctx = {
    region: undefined as string | undefined,
    place: undefined as string | undefined,
    postcode: undefined as string | undefined,
    country: undefined as string | undefined,
  };
  const legacyContext = Array.isArray(f.context) ? f.context : [];
  for (const c of legacyContext) {
    const id = (c.id ?? "").toLowerCase();
    if (id.startsWith("region")) ctx.region = c.text;
    else if (id.startsWith("place")) ctx.place = c.text;
    else if (id.startsWith("postcode")) ctx.postcode = c.text;
    else if (id.startsWith("country")) ctx.country = c.text;
  }
  const v6Context = f.properties?.context;
  if (v6Context && typeof v6Context === "object") {
    const pick = (key: string): string | undefined => {
      const value = v6Context[key];
      if (!value) return undefined;
      return value.name ?? value.text ?? undefined;
    };
    ctx.region = ctx.region ?? pick("region");
    ctx.place = ctx.place ?? pick("place");
    ctx.postcode = ctx.postcode ?? pick("postcode");
    ctx.country = ctx.country ?? pick("country");
  }
  const addressLine1 = [f.address, f.text].filter(Boolean).join(" ").trim()
    || f.properties?.name?.trim()
    || f.properties?.full_address?.split(",")[0]?.trim()
    || (f.place_name ?? "").split(",")[0]?.trim()
    || null;
  const placeName =
    f.place_name
    ?? f.properties?.full_address
    ?? [f.properties?.name, f.properties?.place_formatted].filter(Boolean).join(", ")
    ?? "";
  return {
    address_line1: addressLine1,
    city: ctx.place ?? null,
    state: ctx.region ?? null,
    postal_code: ctx.postcode ?? null,
    country: ctx.country ?? null,
    latitude,
    longitude,
    place_name: placeName,
  };
}

const MIN_QUERY_LENGTH = 3;

function normalizePublicToken(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("pk.")) return null;
  if (/\s/.test(trimmed)) return null;
  return trimmed;
}

function tokenDebugMeta(raw: string | null | undefined, normalized: string | null) {
  const source = typeof raw === "string" ? raw : "";
  return {
    prefix: normalized ? `${normalized.slice(0, 10)}…` : null,
    length: normalized?.length ?? 0,
    startsWithPk: normalized ? normalized.startsWith("pk.") : false,
    hasWhitespace: /\s/.test(source),
    hasNewline: /[\r\n]/.test(source),
    hasLeadingOrTrailingWhitespace: source.length > 0 && source !== source.trim(),
    validPublicToken: Boolean(normalized),
  };
}

async function fetchSuggestions(query: string, token: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < MIN_QUERY_LENGTH) return [];
  const v6 = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  v6.searchParams.set("access_token", token);
  v6.searchParams.set("q", q);
  v6.searchParams.set("limit", "5");
  v6.searchParams.set("types", "address,street,place,postcode");

  const v5 = new URL(
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(q) + ".json"
  );
  v5.searchParams.set("access_token", token);
  v5.searchParams.set("types", "address,place");
  v5.searchParams.set("limit", "5");

  const endpoints = [
    { label: "v6", url: v6.toString() },
    { label: "v5", url: v5.toString() },
  ];

  let sawUnauthorized = false;
  for (const endpoint of endpoints) {
    const res = await fetch(endpoint.url);
    let data: MapboxResponse & { message?: string };
    try {
      data = (await res.json()) as MapboxResponse & { message?: string };
    } catch {
      data = {};
    }
    if (!res.ok) {
      if (res.status === 401) sawUnauthorized = true;
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[AddressAutocomplete] Mapbox ${endpoint.label} failed:`,
          res.status,
          data?.message ?? res.statusText
        );
      }
      continue;
    }
    const out: AddressSuggestion[] = [];
    for (const f of data.features ?? []) {
      const parsed = parseFeature(f);
      if (parsed) out.push(parsed);
    }
    if (out.length > 0) return out;
    return [];
  }

  if (sawUnauthorized) {
    console.error(
      "[AddressAutocomplete] Mapbox request failed with 401 on both v6 and v5 endpoints."
    );
    console.warn(
      "[AddressAutocomplete] 401 Invalid Token: Check (1) token in .env.local matches https://account.mapbox.com/access-tokens/ , " +
      "(2) if URL restrictions are set, add http://localhost:3000 and your production URL, (3) token has Geocoding/Search scope."
    );
  }
  return [];
}

type AddressAutocompleteProps = {
  onSelect: (address: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** When provided from server, this is preferred over client-inlined NEXT_PUBLIC values. */
  mapboxToken?: string | null;
};

// Client-side value can be stale if NEXT_PUBLIC_* changed without restart, so it is never treated as authoritative.
function getClientMapboxToken(): string | null {
  if (typeof window === "undefined") return null;
  return normalizePublicToken(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");
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
  const envTokenRaw = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
  const tokenFromEnv = getClientMapboxToken();
  const propTokenRaw = mapboxTokenProp ?? "";
  const tokenFromProp = normalizePublicToken(propTokenRaw);
  const initialToken = tokenFromProp ?? tokenFromEnv ?? null;
  const [token, setToken] = useState<string | null>(() => initialToken);
  const tokenRef = useRef<string>(initialToken ?? "");
  const tokenDiagnosticsLogged = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  tokenRef.current = token ?? "";

  // Dev-only diagnostics: compare env/prop/api tokens without logging full secret values.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (tokenDiagnosticsLogged.current) return;
    tokenDiagnosticsLogged.current = true;
    fetch("/api/mapbox-token", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { token: null }))
      .then((data: { token?: string | null }) => {
        const apiTokenRaw = typeof data?.token === "string" ? data.token : "";
        const apiToken = normalizePublicToken(apiTokenRaw);
        const activeToken = normalizePublicToken(tokenRef.current);
        const envMeta = tokenDebugMeta(envTokenRaw, tokenFromEnv);
        const propMeta = tokenDebugMeta(propTokenRaw, tokenFromProp);
        const apiMeta = tokenDebugMeta(apiTokenRaw, apiToken);
        const activeMeta = tokenDebugMeta(tokenRef.current, activeToken);
        console.log("[AddressAutocomplete] token diagnostics", {
          env: envMeta,
          prop: propMeta,
          api: apiMeta,
          active: activeMeta,
          clientEnvMatchesApi: Boolean(tokenFromEnv && apiToken && tokenFromEnv === apiToken),
          propMatchesApi: Boolean(tokenFromProp && apiToken && tokenFromProp === apiToken),
          activeMatchesApi: Boolean(activeToken && apiToken && activeToken === apiToken),
        });
      })
      .catch((err) => {
        console.warn("[AddressAutocomplete] token diagnostics failed:", err);
      });
  }, [envTokenRaw, tokenFromEnv, propTokenRaw, tokenFromProp]);

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

  // Prefer server-passed token first. Client NEXT_PUBLIC token can be stale due inlining.
  useEffect(() => {
    const preferred = tokenFromProp ?? tokenFromEnv;
    if (!preferred) return;
    if (tokenRef.current === preferred) return;
    setToken(preferred);
    tokenRef.current = preferred;
  }, [tokenFromEnv, tokenFromProp]);

  // Runtime sync: when prop token is absent, API token is authoritative and can replace stale inlined values.
  useEffect(() => {
    if (tokenFromProp) return;
    let cancelled = false;
    fetch("/api/mapbox-token", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) {
          console.warn("[AddressAutocomplete] mapbox-token API status:", r.status, r.statusText);
          return { token: null };
        }
        return r.json();
      })
      .then((data: { token?: string | null }) => {
        if (cancelled) return;
        const value = normalizePublicToken(data?.token);
        if (!value) return;
        const existing = normalizePublicToken(tokenRef.current);
        if (existing === value) return;
        setToken(value);
        tokenRef.current = value;
      })
      .catch((err) => {
        console.warn("[AddressAutocomplete] mapbox-token fetch failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [tokenFromProp]);

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
