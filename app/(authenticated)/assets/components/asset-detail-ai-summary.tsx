"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CornerstoneAiPanel } from "@/app/(authenticated)/components/cornerstone-ai-panel";

type AssetDetailAiSummaryProps = { assetId: string };

export function AssetDetailAiSummary({ assetId }: AssetDetailAiSummaryProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--card-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80"
      >
        <Sparkles className="size-4 text-[var(--accent)]" aria-hidden />
        Summarize this asset
      </button>
      <CornerstoneAiPanel
        open={open}
        onClose={() => setOpen(false)}
        context={{ entityType: "asset", entityId: assetId }}
        initialQuery="Summarize this asset's service history and condition."
      />
    </>
  );
}
