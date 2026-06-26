import Link from "next/link";
import { FLEET_ROUTES, FLEET_SITE_SHORT } from "@/lib/fleet-marketing-site";

type Props = {
  className?: string;
  showText?: boolean;
  compact?: boolean;
  onClick?: () => void;
};

export function FleetLogo({
  className = "",
  showText = true,
  compact = false,
  onClick,
}: Props) {
  return (
    <Link
      href={FLEET_ROUTES.home}
      onClick={onClick}
      className={`group flex min-w-0 items-center gap-2.5 ${className}`}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400/20 to-cyan-500/10 ring-1 ring-teal-400/30">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="h-5 w-5 text-teal-400"
          aria-hidden
        >
          <rect x="4" y="18" width="4" height="8" rx="1" fill="currentColor" opacity="0.7" />
          <rect x="10" y="14" width="4" height="12" rx="1" fill="currentColor" opacity="0.85" />
          <rect x="16" y="10" width="4" height="16" rx="1" fill="currentColor" />
          <path
            d="M20 8h6l2 4v8h-2.5a2.5 2.5 0 1 1-5 0H17a2.5 2.5 0 1 1-5 0H9.5V12l2.5-4h8z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span className="pointer-events-none absolute inset-0 rounded-lg bg-teal-400/10 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
      </span>
      {showText && (
        <span className="min-w-0 truncate">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-400/90">
            Cornerstone
          </span>
          <span
            className={`block font-semibold tracking-tight text-[var(--foreground)] ${
              compact ? "text-sm" : "text-base sm:text-lg"
            }`}
          >
            {FLEET_SITE_SHORT}
          </span>
        </span>
      )}
    </Link>
  );
}
