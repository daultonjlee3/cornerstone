"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navConfig } from "../nav-config";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ open, onClose }: SidebarProps) {
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
          fixed left-0 top-0 z-50 h-screen w-64 shrink-0 border-r border-[var(--card-border)] bg-[var(--card)]
          flex flex-col
          transition-transform duration-200 ease-out lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--card-border)] px-4 lg:justify-start">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-[var(--foreground)]"
          >
            Cornerstone Tech
          </Link>
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
        <nav className="min-h-0 flex-1 overflow-y-auto py-4">
          {navConfig.map((group) => (
            <div key={group.label} className="mb-6">
              <h3 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {group.label}
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href, pathname ?? "");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`
                          block border-l-2 py-2 pl-4 pr-4 text-sm transition-colors
                          ${active
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 font-medium text-[var(--accent)]"
                            : "border-transparent text-[var(--foreground)] hover:bg-[var(--card-border)]/50 hover:text-[var(--foreground)]"
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
        </nav>
      </aside>
    </>
  );
}
