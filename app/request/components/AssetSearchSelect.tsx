"use client";

import { useMemo, useState } from "react";

type AssetOption = { id: string; name: string };

type AssetSearchSelectProps = {
  assets: AssetOption[];
};

export function AssetSearchSelect({ assets }: AssetSearchSelectProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AssetOption | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets.slice(0, 50);
    return assets.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 50);
  }, [assets, query]);

  const displayValue = selected ? selected.name : "";
  const showDropdown = open && (filtered.length > 0 || query.length > 0);

  return (
    <div className="relative space-y-2">
      <span className="ui-label">Asset (optional)</span>
      <input type="hidden" name="asset_id" value={selected?.id ?? ""} />
      <div className="relative">
        <input
          type="text"
          value={selected ? selected.name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder="Search or select an asset…"
          className="ui-input min-h-[48px] w-full rounded-xl border-[var(--card-border)] py-3 pr-10 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
          autoComplete="off"
        />
        {showDropdown && (
          <ul
            className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-[var(--shadow-soft)]"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--muted)]">No assets match</li>
            ) : (
              filtered.map((asset) => (
                <li
                  key={asset.id}
                  role="option"
                  aria-selected={selected?.id === asset.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSelected(asset);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="cursor-pointer px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)]"
                >
                  {asset.name}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {selected && (
        <button
          type="button"
          onClick={() => { setSelected(null); setQuery(""); }}
          className="text-xs font-medium text-[var(--accent)] hover:underline"
        >
          Clear selection
        </button>
      )}
    </div>
  );
}
