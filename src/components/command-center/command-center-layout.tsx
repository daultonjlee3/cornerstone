"use client";

import { useIsLg } from "@/src/lib/use-media-query";

export type CommandCenterLayoutProps = {
  /** Main list/table content. */
  listContent: React.ReactNode;
  /** Detail pane content when an item is selected. Rendered once (desktop: in grid; tablet/mobile: in overlay). */
  detailContent: React.ReactNode;
  /** Whether the detail pane is open (an item is selected). */
  isDetailOpen: boolean;
  /** Called when user requests to close the detail (back/close). */
  onCloseDetail: () => void;
  /** Shown in the right column on desktop when no item is selected. Uses default if not provided. */
  emptyDetailMessage?: React.ReactNode;
  /** Optional title for empty state header (e.g. "Work Order Details"). */
  emptyStateTitle?: string;
  /** Optional class for the root container. */
  className?: string;
};

const DEFAULT_EMPTY_BODY = (
  <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
    <p className="text-sm leading-relaxed text-[var(--muted)] max-w-[260px]">
      Select a work order to view details and take action.
    </p>
    <p className="text-xs text-[var(--muted)]/80">
      Tip: Start with high-priority or overdue work orders.
    </p>
  </div>
);

/**
 * Unified list–detail layout for Command Center screens.
 * - Desktop (lg+): two-column grid; list left, detail right (~35–40% width). Detail stays in flow.
 * - Tablet/Mobile: single column list; detail opens as overlay (drawer/full-screen).
 * Right panel always shows structure when empty: header + empty state.
 */
export function CommandCenterLayout({
  listContent,
  detailContent,
  isDetailOpen,
  onCloseDetail,
  emptyDetailMessage,
  emptyStateTitle = "Work Order Details",
  className = "",
}: CommandCenterLayoutProps) {
  const isLg = useIsLg();
  const emptyBody = emptyDetailMessage ?? DEFAULT_EMPTY_BODY;

  return (
    <>
      <div
        className={`grid min-h-0 grid-cols-1 gap-0 lg:grid-cols-[1fr_minmax(36%,420px)] ${className}`}
        data-command-center-layout
      >
        <div className="min-w-0">{listContent}</div>

        {/* Desktop: detail panel — always present, with header when empty */}
        <aside
          className="hidden min-h-0 lg:block lg:flex lg:flex-col lg:overflow-hidden lg:border-l lg:border-[var(--card-border)]/80 lg:bg-[var(--card)] lg:shadow-[inset_4px_0_0_0_rgba(0,0,0,0.04)]"
          aria-hidden={!isDetailOpen}
        >
          {isDetailOpen ? (
            detailContent
          ) : (
            <>
              <div className="shrink-0 border-b border-[var(--card-border)]/80 bg-[var(--card)] px-5 py-4">
                <h2 className="text-[15px] font-medium text-[var(--foreground)] tracking-tight">
                  {emptyStateTitle}
                </h2>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-auto">
                {emptyBody}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Tablet/Mobile: detail in overlay (slide-over drawer / full-screen) */}
      {!isLg && isDetailOpen && (
        <DetailOverlay onClose={onCloseDetail}>{detailContent}</DetailOverlay>
      )}
    </>
  );
}

type DetailOverlayProps = {
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Overlay container for detail on tablet (slide-over) and mobile (full-screen).
 * - Mobile: full-screen sheet with backdrop, touch-friendly.
 * - md+: slide-over drawer from right (max-w-lg). lg handled by main grid.
 */
function DetailOverlay({ onClose, children }: DetailOverlayProps) {
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
      aria-modal
      role="dialog"
      onClick={handleBackdrop}
      style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      <div
        className="h-full w-full overflow-hidden overflow-y-auto bg-[var(--card)] shadow-xl md:max-w-lg md:rounded-l-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "100dvh" }}
      >
        <div className="flex min-h-full flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

export { DetailOverlay };
