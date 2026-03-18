"use client";

import { useState, useId } from "react";

export type DetailTabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export type DetailTabsProps = {
  tabs: DetailTabItem[];
  defaultTabId?: string;
  /** Optional class for the tabs container. */
  className?: string;
};

/**
 * Simple tab strip for detail panes. No URL sync; controlled by defaultTabId or internal state.
 */
export function DetailTabs({ tabs, defaultTabId, className = "" }: DetailTabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id ?? "");
  const idBase = useId();
  const effectiveActive = tabs.some((t) => t.id === activeId) ? activeId : tabs[0]?.id;
  const activeTab = tabs.find((t) => t.id === effectiveActive);

  if (tabs.length === 0) return null;

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        className="flex gap-1 border-b border-[var(--card-border)]/80 bg-[var(--card)]"
        role="tablist"
        aria-label="Detail sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === effectiveActive}
            aria-controls={`${idBase}-panel-${tab.id}`}
            id={`${idBase}-tab-${tab.id}`}
            onClick={() => setActiveId(tab.id)}
            className={`border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 ease-out ${
              tab.id === effectiveActive
                ? "border-[var(--accent)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`${idBase}-panel-${effectiveActive}`}
        role="tabpanel"
        aria-labelledby={`${idBase}-tab-${effectiveActive}`}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {activeTab?.content}
      </div>
    </div>
  );
}
