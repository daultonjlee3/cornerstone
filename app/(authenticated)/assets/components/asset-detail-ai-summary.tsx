"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CornerstoneAiPanel } from "@/app/(authenticated)/components/cornerstone-ai-panel";

type AssetRecordSummaryPayload = {
  id: string;
  name?: string | null;
  asset_type?: string | null;
  type?: string | null;
  condition?: string | null;
  status?: string | null;
  location?: string | null;
  health_score?: number | null;
  work_order_count?: number;
  pm_due_next?: string | null;
  recentActivity?: string | null;
};

type AssetDetailAiSummaryProps = {
  assetId: string;
  recordSummary: AssetRecordSummaryPayload;
};

export function AssetDetailAiSummary({ assetId, recordSummary }: AssetDetailAiSummaryProps) {
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
        context={{
          entityType: "asset",
          entityId: assetId,
          recordSummary: { asset: recordSummary },
          actionContext: {
            assets: [{ id: recordSummary.id, name: recordSummary.name ?? recordSummary.id }],
          },
        }}
        initialQuery="Summarize this asset's service history and condition."
      />
    </>
  );
}
