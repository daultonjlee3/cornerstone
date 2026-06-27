"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Box,
  CalendarCheck,
  Warehouse,
  Building2,
  Store,
  BarChart2,
  Inbox,
  ExternalLink,
  Activity,
  Users,
  ListTodo,
  Smartphone,
  UsersRound,
  Sparkles,
  LayoutGrid,
  Building,
  MapPin,
  Layers,
  UserCircle,
  Package,
  ShoppingCart,
  FileText,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  ListChecks,
  Container,
  Plug,
  TrendingUp,
  Webhook,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import {
  NavRail,
  NavRailBody,
  NavRailBrand,
  NavRailFooter,
  NavRailGroup,
  NavRailHeader,
  NavRailItem,
} from "@/src/components/design-system";
import { SidebarTooltip } from "@/src/components/ui/tooltip";
import { getNavConfig, isNavItemActive, type NavGroup, type NavItem } from "../nav-config";
import { scrollToFleetOperationsSection } from "@/src/lib/fleet/ui/operations-sections";
import type { ProductProfile } from "@/src/types/fleet";
import { useGetStartedOnboarding } from "@/hooks/useGetStartedOnboarding";
import { AppIcon } from "@/src/components/design-system/icons";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Box,
  CalendarCheck,
  Warehouse,
  Building2,
  Store,
  BarChart2,
  Inbox,
  ExternalLink,
  Activity,
  Users,
  ListTodo,
  Smartphone,
  UsersRound,
  Sparkles,
  LayoutGrid,
  Building,
  MapPin,
  Layers,
  UserCircle,
  Package,
  ShoppingCart,
  FileText,
  Receipt,
  Settings,
  Container,
  Plug,
  TrendingUp,
  Webhook,
  AlertTriangle,
};

function getIcon(item: NavItem): LucideIcon | null {
  if (!item.icon) return null;
  return iconMap[item.icon] ?? null;
}

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showPlatformAdmin?: boolean;
  isDemoGuest?: boolean;
  showResumeOnboarding?: boolean;
  productProfile?: ProductProfile;
};

function demoNavTourId(href: string): string | null {
  const path = href.split("?")[0];
  if (path === "/work-orders") return "nav-work-orders";
  if (path === "/dispatch") return "nav-dispatch";
  if (path === "/assets") return "nav-assets";
  if (path === "/preventive-maintenance") return "nav-preventive-maintenance";
  return null;
}

function collapseStorageKey(groupId: string): string {
  return `cornerstone:nav-collapsed:${groupId}`;
}

export function Sidebar({
  open,
  onClose,
  collapsed = false,
  onToggleCollapse,
  showPlatformAdmin = false,
  isDemoGuest = false,
  showResumeOnboarding = false,
  productProfile = "cmms",
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locationHash, setLocationHash] = useState("");
  const { skipped, allComplete, resumeOnboarding } = useGetStartedOnboarding();
  const showResume = showResumeOnboarding && skipped && !allComplete;

  useEffect(() => {
    const syncHash = () => setLocationHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const navGroups = isDemoGuest
    ? getNavConfig(productProfile).filter((g) => g.id !== "administration")
    : getNavConfig(productProfile);

  return (
    <>
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
        />
      )}
      <div
        className={`fixed left-0 top-0 z-50 h-screen shrink-0 transition-[width] duration-[var(--duration-fast)] ease-[var(--ease-standard)] lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${collapsed ? "w-[var(--nav-rail-width-collapsed)]" : "w-[var(--nav-rail-width)]"}`}
      >
        <NavRail collapsed={collapsed} embedded>
          <NavRailHeader>
            {collapsed ? (
              <div className="flex w-full items-center justify-between gap-1">
                <NavRailBrand
                  href="/operations"
                  title="Cornerstone"
                  subtitle="Mission"
                  icon={Truck}
                  collapsed
                />
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--surface-default)] hover:text-[var(--text-primary)]"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            ) : (
              <>
                <NavRailBrand
                  href="/operations"
                  title="Cornerstone"
                  subtitle={productProfile === "cmms" ? "Operations Command" : "Fleet Mission Control"}
                  icon={Truck}
                />
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="hidden size-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--surface-default)] hover:text-[var(--text-primary)] lg:flex"
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex size-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--surface-default)] hover:text-[var(--text-primary)] lg:hidden"
                    aria-label="Close menu"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </>
            )}
          </NavRailHeader>

          <NavRailBody>
            {showResume && (
              <div className={`mb-3 ${collapsed ? "flex justify-center" : ""}`}>
                {collapsed ? (
                  <SidebarTooltip label="Resume get started" side="right">
                    <button
                      type="button"
                      onClick={() => {
                        resumeOnboarding();
                        onClose();
                      }}
                      className="flex size-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--brand-operational)]/30 bg-[var(--brand-operational-subtle)] text-[var(--brand-operational)]"
                      aria-label="Resume get started"
                    >
                      <ListChecks className="size-4" />
                    </button>
                  </SidebarTooltip>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      resumeOnboarding();
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 cs-text-body text-[var(--brand-operational)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--brand-operational-subtle)]"
                  >
                    <ListChecks className="size-4" />
                    <span>Resume get started</span>
                  </button>
                )}
              </div>
            )}
            {navGroups.map((group) => (
              <NavGroupBlock
                key={group.id}
                group={group}
                pathname={pathname ?? ""}
                searchParams={searchParams}
                locationHash={locationHash}
                collapsed={collapsed}
                onClose={onClose}
              />
            ))}
          </NavRailBody>

          {showPlatformAdmin && (
            <NavRailFooter>
              {collapsed ? (
                <>
                  <SidebarTooltip label="Platform Admin" side="right">
                    <Link
                      href="/platform"
                      onClick={onClose}
                      className="cs-nav-rail__item cs-nav-rail__item--collapsed"
                    >
                      <AppIcon icon={Settings} size="sm" intent="muted" className="cs-nav-rail__item-icon" />
                    </Link>
                  </SidebarTooltip>
                  <SidebarTooltip label="Switch tenant" side="right">
                    <Link
                      href="/platform/tenants?switch=1"
                      onClick={onClose}
                      className="cs-nav-rail__item cs-nav-rail__item--collapsed mt-1"
                    >
                      <AppIcon icon={Building2} size="sm" intent="muted" className="cs-nav-rail__item-icon" />
                    </Link>
                  </SidebarTooltip>
                </>
              ) : (
                <>
                  <Link href="/platform" onClick={onClose} className="cs-nav-rail__item">
                    <AppIcon icon={Settings} size="sm" intent="muted" className="cs-nav-rail__item-icon" />
                    <span className="cs-nav-rail__item-label">Platform Admin</span>
                  </Link>
                  <Link
                    href="/platform/tenants?switch=1"
                    onClick={onClose}
                    className="cs-nav-rail__item mt-1"
                  >
                    <AppIcon icon={Building2} size="sm" intent="muted" className="cs-nav-rail__item-icon" />
                    <span className="cs-nav-rail__item-label">Switch tenant</span>
                  </Link>
                </>
              )}
            </NavRailFooter>
          )}
        </NavRail>
      </div>
    </>
  );
}

function NavGroupBlock({
  group,
  pathname,
  searchParams,
  locationHash,
  collapsed,
  onClose,
}: {
  group: NavGroup;
  pathname: string;
  searchParams: URLSearchParams;
  locationHash: string;
  collapsed: boolean;
  onClose: () => void;
}) {
  const canCollapse = group.defaultCollapsed ?? false;

  const [sectionCollapsed, setSectionCollapsed] = useState(true);

  useEffect(() => {
    if (!canCollapse) {
      setSectionCollapsed(false);
      return;
    }
    const stored = window.localStorage.getItem(collapseStorageKey(group.id));
    if (stored === "expanded") setSectionCollapsed(false);
    else if (stored === "collapsed") setSectionCollapsed(true);
    else setSectionCollapsed(true);
  }, [canCollapse, group.id]);

  const toggleSection = useCallback(() => {
    setSectionCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          collapseStorageKey(group.id),
          next ? "collapsed" : "expanded"
        );
      }
      return next;
    });
  }, [group.id]);

  const handleItemClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      onClose();
      const hashIndex = href.indexOf("#");
      if (hashIndex === -1) return;
      const path = href.slice(0, hashIndex) || pathname;
      const hash = href.slice(hashIndex + 1);
      if (pathname !== path) return;
      event.preventDefault();
      window.history.replaceState(null, "", `${path}#${hash}`);
      if (hash === "fleet-recommendations") {
        scrollToFleetOperationsSection("recommendations");
      } else if (hash === "fleet-exceptions") {
        scrollToFleetOperationsSection("exceptions");
      } else {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [onClose, pathname]
  );

  return (
    <NavRailGroup
      label={collapsed ? undefined : group.label}
      collapsed={collapsed}
      collapsible={canCollapse && !collapsed}
      sectionCollapsed={sectionCollapsed}
      onToggleSection={toggleSection}
    >
      {group.items.map((item) => {
        const active = isNavItemActive(item, pathname, searchParams, locationHash);
        const Icon = getIcon(item);
        const tourId = demoNavTourId(item.href);

        return (
          <NavRailItem
            key={`${group.id}-${item.label}-${item.href}`}
            href={item.href}
            label={item.label}
            icon={Icon ?? undefined}
            active={active}
            collapsed={collapsed}
            onClick={(event) => handleItemClick(event, item.href)}
            tourId={tourId ?? undefined}
          />
        );
      })}
    </NavRailGroup>
  );
}
