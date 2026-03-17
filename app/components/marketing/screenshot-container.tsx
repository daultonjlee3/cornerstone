/**
 * Reusable screenshot container for product screenshots.
 * When src is provided, shows the image; otherwise shows a placeholder.
 * Rounded corners, border, subtle shadow. No fake UI images.
 */

import Image from "next/image";

type Props = {
  caption?: string;
  className?: string;
  aspectRatio?: "video" | "square" | "wide" | "dashboard";
  /** Hero variant: app-window style frame when placeholder */
  variant?: "default" | "hero";
  /** Alt text for image (accessibility and SEO) */
  alt?: string;
  /** Custom placeholder label when no src */
  placeholderLabel?: string;
  /** Path to screenshot image (e.g. /screenshots/dashboard.png). When set, renders Image instead of placeholder. */
  src?: string;
  /** Width for Next/Image (recommended for layout). */
  width?: number;
  /** Height for Next/Image (recommended for layout). */
  height?: number;
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
  src,
  width = 1200,
  height = 800,
}: Props) {
  const isHero = variant === "hero";
  const defaultLabel = "[Product Screenshot Placeholder]";
  const heroLabel = placeholderLabel ?? "Product screenshot coming soon";
  const defaultModeLabel = placeholderLabel ?? defaultLabel;
  const showImage = Boolean(src);

  return (
    <figure
      className={`w-full max-w-full min-w-0 ${className}`}
      {...(alt ? { "aria-label": alt } : {})}
    >
      <div
        className={`relative flex min-h-0 w-full max-w-full overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] transition-shadow duration-200 sm:rounded-2xl ${isHero && !showImage ? "aspect-[2/1] border-[var(--card-border)]/80 bg-gradient-to-b from-[var(--card)] to-[var(--card-border)]/20" : ""} ${!isHero || showImage ? aspectClasses[aspectRatio] : ""} ${!isHero || showImage ? "shadow-[var(--shadow-card)]" : ""}`}
      >
        {showImage ? (
          <Image
            src={src!}
            alt={alt ?? "Cornerstone OS product screenshot"}
            width={width}
            height={height}
            className="h-full w-full object-cover object-top"
            sizes="(max-width: 1024px) 100vw, 1200px"
            priority={isHero}
          />
        ) : isHero ? (
          <>
            <div
              className="absolute left-0 right-0 top-0 flex h-9 items-center gap-1.5 border-b border-[var(--card-border)]/70 bg-[var(--card)]/90 px-3 sm:h-10 sm:px-4"
              aria-hidden
            >
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]/30 sm:h-2.5 sm:w-2.5" />
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]/30 sm:h-2.5 sm:w-2.5" />
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]/30 sm:h-2.5 sm:w-2.5" />
            </div>
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
