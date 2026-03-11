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
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = (await res.json()) as MapboxResponse;
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
};

export function AddressAutocomplete({
  onSelect,
  placeholder = "Search for an address…",
  className = "",
  disabled = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const token =
    typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "").trim() : "";

  const loadSuggestions = useCallback(
    async (q: string) => {
      if (!token || !q.trim()) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const list = await fetchSuggestions(q, token);
        setSuggestions(list);
        setOpen(list.length > 0);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => loadSuggestions(query), 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, loadSuggestions]);

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
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={hasToken ? placeholder : "Enter address manually (no Mapbox token)"}
        className={className || "ui-input"}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        role="combobox"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
          Searching…
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
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
