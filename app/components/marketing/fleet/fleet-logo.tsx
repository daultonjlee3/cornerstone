import Link from "next/link";
import { FLEET_ROUTES } from "@/lib/fleet-marketing-site";

const TEAL = "#2dd4bf";

type Props = {
  className?: string;
  showText?: boolean;
  compact?: boolean;
  onClick?: () => void;
};

function FleetLogoMark({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <polygon
        points="24,4 42,14 42,34 24,44 6,34 6,14"
        stroke={TEAL}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Growth bars */}
      <g stroke={TEAL} strokeWidth="1.5" strokeLinecap="round">
        <line x1="12.5" y1="29.5" x2="12.5" y2="24.5" />
        <line x1="11.5" y1="24.5" x2="13.5" y2="23.5" />
        <line x1="16.5" y1="29.5" x2="16.5" y2="20.5" />
        <line x1="15.5" y1="20.5" x2="17.5" y2="19.5" />
        <line x1="20.5" y1="29.5" x2="20.5" y2="16.5" />
        <line x1="19.5" y1="16.5" x2="21.5" y2="15.5" />
      </g>

      {/* Box truck — side profile with cab, cargo box, and wheels */}
      <path
        d="M 24.8 29.2 V 27.4 L 27.2 23.2 H 30.4 V 20.8 H 38.8 V 29.2 H 24.8 Z"
        stroke={TEAL}
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill={TEAL}
        fillOpacity="0.12"
      />
      <circle cx="28.5" cy="30.4" r="1.45" fill={TEAL} />
      <circle cx="35.8" cy="30.4" r="1.45" fill={TEAL} />
    </svg>
  );
}

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
      className={`group flex min-w-0 items-center gap-3 ${className}`}
      aria-label="Cornerstone Fleet Intelligence"
    >
      <FleetLogoMark className={compact ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11"} />
      {showText && (
        <span className="min-w-0 leading-none">
          <span
            className={`block font-bold uppercase text-white ${
              compact
                ? "text-[11px] tracking-[0.14em]"
                : "text-xs tracking-[0.16em] sm:text-sm sm:tracking-[0.18em]"
            }`}
          >
            Cornerstone
          </span>
          <span
            className={`mt-1 block font-medium uppercase text-teal-400 ${
              compact
                ? "text-[9px] tracking-[0.12em]"
                : "text-[10px] tracking-[0.14em] sm:text-[11px] sm:tracking-[0.16em]"
            }`}
          >
            Fleet Intelligence
          </span>
        </span>
      )}
    </Link>
  );
}
