"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navConfig } from "../nav-config";

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

export function Sidebar({ open, onClose, collapsed = false, onToggleCollapse, showPlatformAdmin = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu"
        />
      )}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen shrink-0 flex-col border-r border-[var(--card-border)] bg-[var(--card)] shadow-[0_6px_18px_rgba(15,23,42,0.05)]
          transition-[transform,width] duration-200 ease-out
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "w-64 lg:w-16" : "w-64"}
        `}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--card-border)] px-2 lg:px-3">
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex size-10 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--card-border)] hover:text-[var(--foreground)]"
              aria-label="Expand sidebar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="min-w-0 truncate text-lg font-semibold tracking-tight text-[var(--foreground)]"
              >
                Cornerstone Tech
              </Link>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="hidden rounded p-2 text-[var(--muted)] hover:bg-[var(--card-border)] hover:text-[var(--foreground)] lg:block"
                  aria-label="Minimize sidebar"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded p-2 text-[var(--muted)] hover:bg-[var(--card-border)] hover:text-[var(--foreground)] lg:hidden"
                  aria-label="Close menu"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
        {!collapsed && (
          <nav className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              {navConfig.map((group) => (
                <div key={group.label} className="mb-6">
                  <h3 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    {group.label}
                  </h3>
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const active = isActive(item.href, pathname ?? "");
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={`
                              block rounded-r-lg border-l-2 py-2 pl-4 pr-4 text-sm transition-colors
                              ${active
                                ? "border-[var(--accent)] bg-[var(--accent)]/12 font-medium text-[var(--accent)]"
                                : "border-transparent text-[var(--foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                              }
                            `}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            {showPlatformAdmin && (
              <div className="shrink-0 border-t border-[var(--card-border)] px-4 py-3">
                <Link
                  href="/platform"
                  onClick={onClose}
                  className="block rounded-r-lg border-l-2 border-transparent py-2 pl-4 pr-4 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                >
                  Platform Admin
                </Link>
              </div>
            )}
          </nav>
        )}
      </aside>
    </>
  );
}
