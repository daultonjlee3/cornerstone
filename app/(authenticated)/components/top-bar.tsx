"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SignOutButton } from "@/app/components/sign-out-button";

type NotificationItem = {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

function notificationHref(item: NotificationItem): string {
  if (item.entity_type === "work_order") return `/work-orders/${item.entity_id}`;
  if (item.entity_type === "work_request") return "/requests";
  if (item.entity_type === "preventive_maintenance_plan") {
    return `/preventive-maintenance/${item.entity_id}`;
  }
  return "/dashboard";
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type TopBarProps = {
  tenantName: string;
  companyName: string;
  onMenuClick: () => void;
  isImpersonating?: boolean;
  onReturnToProfile?: () => void;
};

export function TopBar({
  tenantName,
  companyName,
  onMenuClick,
  isImpersonating = false,
  onReturnToProfile,
}: TopBarProps) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);

  const initials = `${tenantName.slice(0, 1)}${companyName.slice(0, 1)}`.toUpperCase();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=15", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        unreadCount?: number;
        items?: NotificationItem[];
      };
      setUnreadCount(data.unreadCount ?? 0);
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (notificationId: string) => {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as {
      unreadCount?: number;
      items?: NotificationItem[];
    };
    setUnreadCount(data.unreadCount ?? 0);
    setItems(data.items ?? []);
  }, []);

  const markAllRead = useCallback(async () => {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as {
      unreadCount?: number;
      items?: NotificationItem[];
    };
    setUnreadCount(data.unreadCount ?? 0);
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!notificationOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target as Node)
      ) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [notificationOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [accountOpen]);

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 9 ? "9+" : String(unreadCount);
  }, [unreadCount]);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)]/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded p-2 text-[var(--muted)] hover:bg-[var(--card-border)] hover:text-[var(--foreground)] lg:hidden"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="hidden flex-1 px-4 lg:block">
        <label htmlFor="topbar-search" className="sr-only">
          Search
        </label>
        <div className="relative max-w-md">
          <svg
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
          </svg>
          <input
            id="topbar-search"
            type="search"
            placeholder="Search work orders, assets, technicians..."
            className="ui-input !bg-[var(--background)] py-2 pl-9 pr-3"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationPanelRef}>
          <button
            type="button"
            className="relative rounded-lg border border-[var(--card-border)] p-2 text-[var(--muted)] hover:bg-[var(--background)]/70 hover:text-[var(--foreground)]"
            aria-label="Notifications"
            onClick={() => {
              setNotificationOpen((prev) => !prev);
              if (!notificationOpen) {
                void loadNotifications();
              }
            }}
          >
            {unreadLabel ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {unreadLabel}
              </span>
            ) : null}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
            </svg>
          </button>
          {notificationOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-96 max-w-[90vw] rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
              <div className="flex items-center justify-between border-b border-[var(--card-border)] px-3 py-2">
                <p className="text-sm font-semibold text-[var(--foreground)]">Notifications</p>
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <p className="px-3 py-4 text-sm text-[var(--muted)]">Loading…</p>
                ) : items.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-[var(--muted)]">No notifications yet.</p>
                ) : (
                  <ul className="divide-y divide-[var(--card-border)]">
                    {items.map((item) => (
                      <li key={item.id}>
                        <a
                          href={notificationHref(item)}
                          onClick={() => {
                            if (!item.read_at) {
                              void markRead(item.id);
                            }
                            setNotificationOpen(false);
                          }}
                          className={`block px-3 py-3 hover:bg-[var(--background)]/60 ${
                            item.read_at ? "" : "bg-[var(--accent)]/5"
                          }`}
                        >
                          <p className="text-sm text-[var(--foreground)]">{item.message}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{formatWhen(item.created_at)}</p>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-xs text-[var(--muted)]">{tenantName}</p>
          <p className="text-xs font-medium text-[var(--foreground)]">{companyName}</p>
        </div>
        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((o) => !o)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-semibold text-[var(--accent)] hover:opacity-90"
            aria-expanded={accountOpen}
            aria-haspopup="true"
            aria-label="Account menu"
          >
            {initials}
          </button>
          {accountOpen ? (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
              role="menu"
            >
              {isImpersonating && onReturnToProfile ? (
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
                  onClick={() => {
                    setAccountOpen(false);
                    onReturnToProfile();
                  }}
                >
                  Return to My Profile
                </button>
              ) : null}
              <div
                className={
                  isImpersonating && onReturnToProfile
                    ? "border-t border-[var(--card-border)] px-3 py-2"
                    : "px-3 py-2"
                }
              >
                <SignOutButton />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
