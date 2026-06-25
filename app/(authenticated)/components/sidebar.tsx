"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  X,
  ListChecks,
  Container,
  Plug,
  TrendingUp,
  Webhook,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { SidebarTooltip } from "@/src/components/ui/tooltip";
import { getNavConfig, isNavItemActive, type NavGroup, type NavItem } from "../nav-config";
import type { ProductProfile } from "@/src/types/fleet";
import { useGetStartedOnboarding } from "@/hooks/useGetStartedOnboarding";

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
  /** When true, show "Resume get started" when onboarding was skipped. */
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
  const { skipped, allComplete, resumeOnboarding } = useGetStartedOnboarding();
  const showResume = showResumeOnboarding && skipped && !allComplete;

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
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen shrink-0 flex-col
          border-r border-[var(--card-border)] bg-[var(--card)]/95 shadow-[var(--shadow-card)] backdrop-blur-xl
          transition-[width] duration-200 ease-out
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "w-[4.25rem]" : "w-60"}
        `}
        style={{ boxShadow: "2px 0 12px rgba(0,0,0,0.04)" }}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--card-border)] px-3">
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex size-9 items-center justify-center rounded-lg text-[var(--muted)] transition-all duration-150 hover:scale-105 hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="size-5" />
            </button>
          ) : (
            <>
              <Link
                href="/operations"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pr-1 transition-colors hover:bg-[var(--background)]/80"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/12 text-[var(--accent)]">
                  <Truck className="size-5" strokeWidth={2.25} />
                </span>
                <span className="min-w-0 truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
                  Cornerstone{" "}
                  <span className="font-normal text-[var(--muted)]">
                    {productProfile === "cmms" ? "OS" : "Fleet"}
                  </span>
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden size-8 items-center justify-center rounded-lg text-[var(--muted)] transition-all duration-150 hover:scale-105 hover:bg-[var(--background)] hover:text-[var(--foreground)] lg:flex"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)] lg:hidden"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>
            </>
          )}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-3 scrollbar-thin">
            {showResume && (
              <div className={`mb-3 ${collapsed ? "flex justify-center px-1" : "px-1.5"}`}>
                {collapsed ? (
                  <SidebarTooltip label="Resume get started" side="right">
                    <button
                      type="button"
                      onClick={() => {
                        resumeOnboarding();
                        onClose();
                      }}
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
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
                    className="flex w-full cursor-pointer items-center gap-3 rounded-full px-2.5 py-2 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                      <ListChecks className="size-4" />
                    </span>
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
                collapsed={collapsed}
                onClose={onClose}
              />
            ))}
          </div>
          {showPlatformAdmin && (
            <div className="shrink-0 space-y-1 border-t border-[var(--card-border)] px-2 py-2">
              {collapsed ? (
                <>
                  <SidebarTooltip label="Platform Admin" side="right">
                    <Link
                      href="/platform"
                      onClick={onClose}
                      className="group flex cursor-pointer items-center justify-center rounded-full px-2 py-2 text-sm text-[var(--muted)] transition-all duration-150 hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] transition-transform duration-150 group-hover:scale-105">
                        <Settings className="size-4" />
                      </span>
                    </Link>
                  </SidebarTooltip>
                  <SidebarTooltip label="Switch tenant" side="right">
                    <Link
                      href="/platform/tenants?switch=1"
                      onClick={onClose}
                      className="group flex cursor-pointer items-center justify-center rounded-full px-2 py-2 text-sm text-[var(--muted)] transition-all duration-150 hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]/20 text-[var(--muted)] transition-transform duration-150 group-hover:scale-105">
                        <Building2 className="size-4" />
                      </span>
                    </Link>
                  </SidebarTooltip>
                </>
              ) : (
                <>
                  <Link
                    href="/platform"
                    onClick={onClose}
                    className="group flex cursor-pointer items-center gap-3 rounded-full px-2.5 py-2 text-sm text-[var(--muted)] transition-all duration-150 hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] transition-transform duration-150 group-hover:scale-105">
                      <Settings className="size-4" />
                    </span>
                    <span>Platform Admin</span>
                  </Link>
                  <Link
                    href="/platform/tenants?switch=1"
                    onClick={onClose}
                    className="group flex cursor-pointer items-center gap-3 rounded-full px-2.5 py-2 text-sm text-[var(--muted)] transition-all duration-150 hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]/20 text-[var(--muted)] transition-transform duration-150 group-hover:scale-105">
                      <Building2 className="size-4" />
                    </span>
                    <span>Switch tenant</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

function NavGroupBlock({
  group,
  pathname,
  searchParams,
  collapsed,
  onClose,
}: {
  group: NavGroup;
  pathname: string;
  searchParams: URLSearchParams;
  collapsed: boolean;
  onClose: () => void;
}) {
  const isSecondary = group.secondary ?? false;
  const canCollapse = group.defaultCollapsed ?? false;

  const initialCollapsed = useMemo(() => {
    if (!canCollapse) return false;
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(collapseStorageKey(group.id));
    if (stored === "expanded") return false;
    if (stored === "collapsed") return true;
    return true;
  }, [canCollapse, group.id]);

  const [sectionCollapsed, setSectionCollapsed] = useState(initialCollapsed);

  useEffect(() => {
    if (!canCollapse) return;
    setSectionCollapsed(initialCollapsed);
  }, [canCollapse, initialCollapsed]);

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

  const showItems = !canCollapse || !sectionCollapsed || collapsed;

  return (
    <div
      className={`mb-3 ${isSecondary ? "mt-0.5" : ""} ${canCollapse ? "rounded-lg border border-[var(--card-border)]/60 bg-[var(--background)]/30 px-1 py-1" : ""}`}
    >
      {!collapsed && (
        <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
          {canCollapse ? (
            <button
              type="button"
              onClick={toggleSection}
              className="flex min-w-0 flex-1 items-center gap-1 rounded-md py-0.5 text-left transition-colors hover:bg-[var(--background)]/80"
              aria-expanded={!sectionCollapsed}
            >
              <ChevronDown
                className={`size-3.5 shrink-0 text-[var(--muted)] transition-transform ${sectionCollapsed ? "-rotate-90" : ""}`}
                aria-hidden
              />
              <h3
                className={`truncate text-[10px] font-semibold uppercase tracking-wider ${isSecondary ? "text-[var(--muted)]" : "text-[var(--muted-strong)]"}`}
              >
                {group.label}
              </h3>
            </button>
          ) : (
            <h3
              className={`px-1 text-[10px] font-semibold uppercase tracking-wider ${isSecondary ? "text-[var(--muted)]" : "text-[var(--muted-strong)]"}`}
            >
              {group.label}
            </h3>
          )}
        </div>
      )}
      {collapsed && !isSecondary && (
        <div className="mb-1.5 h-px bg-[var(--card-border)] px-1" aria-hidden />
      )}
      {showItems ? (
        <ul className="space-y-0.5">
          {group.items.map((item) => {
            const active = isNavItemActive(item, pathname, searchParams);
            const Icon = getIcon(item);
            const tourId = demoNavTourId(item.href);
            const linkContent = (
              <Link
                href={item.href}
                onClick={onClose}
                data-tour={tourId ?? undefined}
                className={`
                  group flex min-h-[42px] cursor-pointer items-center gap-3 rounded-full px-2.5 py-1.5 text-sm transition-all duration-150
                  ${collapsed ? "justify-center px-2" : ""}
                  ${active
                    ? "bg-[var(--accent)]/15 font-medium text-[var(--accent)]"
                    : isSecondary
                      ? "text-[var(--muted)] hover:bg-[var(--background)]/80 hover:text-[var(--foreground)]"
                      : "text-[var(--foreground)] hover:bg-[var(--background)]/80"}
                `}
                title={collapsed ? undefined : item.label}
              >
                {Icon ? (
                  <span
                    className={`
                      flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105
                      ${active
                        ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                        : isSecondary
                          ? "bg-[var(--muted)]/10 text-[var(--muted)]"
                          : "bg-[var(--accent)]/10 text-[var(--accent)]"}
                    `}
                  >
                    <Icon className="size-4" />
                  </span>
                ) : null}
                {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
              </Link>
            );
            return (
              <li key={`${group.id}-${item.label}-${item.href}`}>
                {collapsed ? (
                  <SidebarTooltip label={item.label} side="right" className="w-full">
                    {linkContent}
                  </SidebarTooltip>
                ) : (
                  linkContent
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
