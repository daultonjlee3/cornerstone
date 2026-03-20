import Image from "next/image";
import Link from "next/link";

/** Public path — hex "C" emblem (icon-only). Same asset family as app icon / marketing. */
export const CORNERSTONE_HEX_EMBLEM_SRC = "/branding/hex-emblem.png";

type CornerstoneHexEmblemProps = {
  /** Display size in CSS pixels (e.g. 20 for sidebar). Image is served at 2× for sharpness. */
  size?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Icon-only hex emblem for nav, sidebars, and compact UI.
 */
export function CornerstoneHexEmblem({
  size = 20,
  className = "shrink-0 object-contain",
  priority = false,
}: CornerstoneHexEmblemProps) {
  const intrinsic = Math.round(size * 2);
  return (
    <Image
      src={CORNERSTONE_HEX_EMBLEM_SRC}
      alt=""
      width={intrinsic}
      height={intrinsic}
      className={className}
      style={{ width: size, height: size }}
      priority={priority}
    />
  );
}

type CornerstoneWordmarkProps = {
  href?: string;
  /** Total emblem width in px */
  emblemSize?: number;
  /** Show "Cornerstone OS" next to emblem */
  showText?: boolean;
  className?: string;
  textClassName?: string;
};

/**
 * Hex emblem + "Cornerstone OS" for headers and auth panels.
 */
export function CornerstoneWordmark({
  href,
  emblemSize = 28,
  showText = true,
  className = "flex min-w-0 shrink items-center gap-2.5",
  textClassName = "truncate text-base font-semibold tracking-tight text-[var(--foreground)]",
}: CornerstoneWordmarkProps) {
  const inner = (
    <>
      <CornerstoneHexEmblem size={emblemSize} priority />
      {showText ? <span className={textClassName}>Cornerstone OS</span> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <span className={className}>{inner}</span>;
}
