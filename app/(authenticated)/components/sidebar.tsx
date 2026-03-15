"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  type LucideIcon,
} from "lucide-react";
import { SidebarTooltip } from "@/src/components/ui/tooltip";
import { navConfig, type NavGroup, type NavItem } from "../nav-config";

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
};

function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  open,
  onClose,
  collapsed = false,
  onToggleCollapse,
  showPlatformAdmin = false,
}: SidebarProps) {
  const pathname = usePathname();

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
        {/* Brand / logo area — emblem in pill + Cornerstone + collapse chevron */}
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
                href="/dashboard"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pr-1 transition-colors hover:bg-[var(--background)]/80"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/12 text-[var(--accent)]">
                  <Box className="size-5" strokeWidth={2.25} />
                </span>
                <span className="min-w-0 truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
                  Cornerstone <span className="font-normal text-[var(--muted)]">OS</span>
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
          <div className="min-h-0 flex-1 overflow-y-auto py-3 scrollbar-thin">
            {navConfig.map((group) => (
              <NavGroupBlock
                key={group.label}
                group={group}
                pathname={pathname ?? ""}
                collapsed={collapsed}
                onClose={onClose}
              />
            ))}
          </div>
            {showPlatformAdmin && (
              <div className="shrink-0 border-t border-[var(--card-border)] px-2 py-2 space-y-1">
                {collapsed ? (
                  <>
                    <SidebarTooltip label="Platform Admin" side="right">
                      <Link
                        href="/platform"
                        onClick={onClose}
                        className="group flex cursor-pointer items-center justify-center rounded-full px-2 py-2 text-sm transition-all duration-150 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105 bg-[var(--accent)]/10 text-[var(--accent)]">
                          <Settings className="size-4" />
                        </span>
                      </Link>
                    </SidebarTooltip>
                    <SidebarTooltip label="Switch tenant" side="right">
                      <Link
                        href="/platform/tenants?switch=1"
                        onClick={onClose}
                        className="group flex cursor-pointer items-center justify-center rounded-full px-2 py-2 text-sm transition-all duration-150 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105 bg-[var(--muted)]/20 text-[var(--muted)]">
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
                      className="group flex cursor-pointer items-center gap-3 rounded-full px-2.5 py-2 text-sm transition-all duration-150 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105 bg-[var(--accent)]/10 text-[var(--accent)]">
                        <Settings className="size-4" />
                      </span>
                      <span>Platform Admin</span>
                    </Link>
                    <Link
                      href="/platform/tenants?switch=1"
                      onClick={onClose}
                      className="group flex cursor-pointer items-center gap-3 rounded-full px-2.5 py-2 text-sm transition-all duration-150 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105 bg-[var(--muted)]/20 text-[var(--muted)]">
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
  collapsed,
  onClose,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  onClose: () => void;
}) {
  const isSecondary = group.secondary ?? false;

  return (
    <div className={`mb-4 ${isSecondary ? "mt-1" : ""}`}>
      {!collapsed && (
        <h3
          className={`
            px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider
            ${isSecondary ? "text-[var(--muted)]" : "text-[var(--muted-strong)]"}
          `}
        >
          {group.label}
        </h3>
      )}
      {collapsed && !isSecondary && (
        <div className="mb-1 h-px bg-[var(--card-border)] px-2" aria-hidden />
      )}
      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const active = isActive(item.href, pathname);
          const Icon = getIcon(item);
          const linkContent = (
            <Link
              href={item.href}
              onClick={onClose}
              className={`
                group flex cursor-pointer items-center gap-3 rounded-full px-2.5 py-2 text-sm transition-all duration-150
                ${collapsed ? "justify-center px-2" : ""}
                ${active
                  ? "bg-[var(--accent)]/15 font-medium text-[var(--accent)]"
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
            <li key={item.href}>
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
    </div>
  );
}
