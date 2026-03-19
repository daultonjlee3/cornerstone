"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CornerstoneAiPanel } from "@/app/(authenticated)/components/cornerstone-ai-panel";

type AssetListSummaryPayload = {
  total: number;
  byStatus: Record<string, number>;
  byPriority?: Record<string, number>;
};

type AssetListAiSummaryProps = {
  listSummary: AssetListSummaryPayload;
};

export function AssetListAiSummary({ listSummary }: AssetListAiSummaryProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80 hover:text-[var(--accent)]"
      >
        <Sparkles className="size-4" aria-hidden />
        Summarize queue
      </button>
      <CornerstoneAiPanel
        open={open}
        onClose={() => setOpen(false)}
        context={{
          entityType: "list",
          listFilters: { entityType: "assets" },
          recordSummary: { listSummary },
        }}
        initialQuery="Summarize the current assets list and any notable issues."
      />
    </>
  );
}
