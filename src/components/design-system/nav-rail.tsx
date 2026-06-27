import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AppIcon } from "./icons";

type NavRailProps = {
  children: ReactNode;
  collapsed?: boolean;
  /** When true, fills parent instead of fixed positioning (for shell integration). */
  embedded?: boolean;
  className?: string;
};

export function NavRail({ children, collapsed = false, embedded = false, className = "" }: NavRailProps) {
  return (
    <aside
      className={`cs-nav-rail ${collapsed ? "cs-nav-rail--collapsed" : ""} ${embedded ? "cs-nav-rail--embedded" : ""} ${className}`}
    >
      {children}
    </aside>
  );
}

export function NavRailHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cs-nav-rail__header ${className}`}>{children}</div>;
}

export function NavRailBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <nav className={`cs-nav-rail__body ${className}`}>{children}</nav>;
}

export function NavRailFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cs-nav-rail__footer ${className}`}>{children}</div>;
}

export function NavRailGroup({
  label,
  children,
  collapsed = false,
  collapsible = false,
  sectionCollapsed = false,
  onToggleSection,
}: {
  label?: string;
  children: ReactNode;
  collapsed?: boolean;
  collapsible?: boolean;
  sectionCollapsed?: boolean;
  onToggleSection?: () => void;
}) {
  return (
    <div className="cs-nav-rail__group">
      {label && !collapsed ? (
        collapsible ? (
          <button
            type="button"
            onClick={onToggleSection}
            className="cs-nav-rail__group-label cs-nav-rail__group-label--button"
            aria-expanded={!sectionCollapsed}
          >
            <span className={`cs-nav-rail__chevron ${sectionCollapsed ? "cs-nav-rail__chevron--collapsed" : ""}`} aria-hidden>
              ›
            </span>
            {label}
          </button>
        ) : (
          <p className="cs-nav-rail__group-label">{label}</p>
        )
      ) : null}
      {(!collapsible || !sectionCollapsed || collapsed) && (
        <ul className="cs-nav-rail__list">{children}</ul>
      )}
    </div>
  );
}

type NavRailItemProps = {
  href: string;
  label: string;
  icon?: LucideIcon;
  active?: boolean;
  collapsed?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  tourId?: string;
};

export function NavRailItem({
  href,
  label,
  icon: Icon,
  active = false,
  collapsed = false,
  onClick,
  tourId,
}: NavRailItemProps) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        data-tour={tourId}
        title={collapsed ? label : undefined}
        className={`cs-nav-rail__item ${active ? "cs-nav-rail__item--active" : ""} ${collapsed ? "cs-nav-rail__item--collapsed" : ""}`}
      >
        {Icon ? (
          <AppIcon icon={Icon} size="sm" intent={active ? "operational" : "muted"} className="cs-nav-rail__item-icon" />
        ) : null}
        {!collapsed ? <span className="cs-nav-rail__item-label">{label}</span> : null}
        {active && !collapsed ? <span className="cs-nav-rail__item-indicator" aria-hidden /> : null}
      </Link>
    </li>
  );
}

export function NavRailBrand({
  href,
  title,
  subtitle,
  icon: Icon,
  collapsed = false,
}: {
  href: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  collapsed?: boolean;
}) {
  return (
    <Link href={href} className={`cs-nav-rail__brand ${collapsed ? "cs-nav-rail__brand--collapsed" : ""}`}>
      {Icon ? (
        <span className="cs-nav-rail__brand-icon">
          <AppIcon icon={Icon} size="md" intent="operational" />
        </span>
      ) : null}
      {!collapsed ? (
        <span className="cs-nav-rail__brand-text">
          <span className="cs-nav-rail__brand-title">{title}</span>
          {subtitle ? <span className="cs-nav-rail__brand-subtitle">{subtitle}</span> : null}
        </span>
      ) : null}
    </Link>
  );
}
