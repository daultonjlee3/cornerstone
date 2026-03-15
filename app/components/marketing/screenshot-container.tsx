/**
 * Reusable screenshot container for product screenshots (to be added later).
 * Rounded corners, border, subtle shadow, neutral placeholder.
 * No fake UI images. variant="hero" adds a polished empty state for the homepage.
 */

type Props = {
  caption?: string;
  className?: string;
  aspectRatio?: "video" | "square" | "wide" | "dashboard";
  /** Hero variant: app-window style frame, gradient + subtle grid, centered label */
  variant?: "default" | "hero";
  /** Alt text for future image; used when real screenshot is added for accessibility and SEO */
  alt?: string;
  /** Custom placeholder label inside the container (e.g. "[Work Order Management Screenshot Placeholder]") */
  placeholderLabel?: string;
};

const aspectClasses: Record<NonNullable<Props["aspectRatio"]>, string> = {
  video: "aspect-video",
  square: "aspect-square",
  wide: "aspect-[21/9]",
  dashboard: "aspect-[2/1]",
};

export function ScreenshotContainer({
  caption,
  className = "",
  aspectRatio = "video",
  variant = "default",
  alt,
  placeholderLabel,
}: Props) {
  const isHero = variant === "hero";
  const defaultLabel = "[Product Screenshot Placeholder]";
  const heroLabel = placeholderLabel ?? "Product screenshot coming soon";
  const defaultModeLabel = placeholderLabel ?? defaultLabel;

  return (
    <figure
      className={`w-full max-w-full min-w-0 ${className}`}
      {...(alt ? { "aria-label": alt } : {})}
    >
      <div
        className={`relative flex min-h-0 w-full max-w-full overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] transition-shadow duration-200 sm:rounded-2xl ${isHero ? "aspect-[2/1] border-[var(--card-border)]/80 bg-gradient-to-b from-[var(--card)] to-[var(--card-border)]/20" : ""} ${!isHero ? aspectClasses[aspectRatio] : ""} ${!isHero ? "shadow-[var(--shadow-card)]" : ""}`}
      >
        {isHero ? (
          <>
            {/* Window chrome: thin top bar */}
            <div
              className="absolute left-0 right-0 top-0 flex h-9 items-center gap-1.5 border-b border-[var(--card-border)]/70 bg-[var(--card)]/90 px-3 sm:h-10 sm:px-4"
              aria-hidden
            >
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]/30 sm:h-2.5 sm:w-2.5" />
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]/30 sm:h-2.5 sm:w-2.5" />
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]/30 sm:h-2.5 sm:w-2.5" />
            </div>
            {/* Subtle grid texture */}
            <div
              className="absolute inset-0 opacity-[0.4]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
                `,
                backgroundSize: "20px 20px",
              }}
              aria-hidden
            />
            {/* Centered placeholder label */}
            <div className="relative flex flex-1 items-center justify-center pt-9">
              <span className="text-xs font-medium text-[var(--muted)]/90 sm:text-sm">
                {heroLabel}
              </span>
            </div>
          </>
        ) : (
          <span className="mk-caption px-4 text-center font-medium">
            {defaultModeLabel}
          </span>
        )}
      </div>
      {caption ? (
        <figcaption className="mt-4 text-center text-xs text-[var(--muted)]/90">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** @deprecated Use ScreenshotContainer. Kept for backwards compatibility. */
export const ScreenshotPlaceholder = ScreenshotContainer;
