"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  getNotifications,
  getNotificationsUnreadCount,
  markAsRead,
  markAllAsRead,
  type NotificationItem,
} from "@/app/(authenticated)/notifications/actions";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const [listRes, countRes] = await Promise.all([
      getNotifications({ limit: 20 }),
      getNotificationsUnreadCount(),
    ]);
    if (listRes.notifications) setNotifications(listRes.notifications);
    if (countRes.count !== undefined) setUnreadCount(countRes.count);
    setLoading(false);
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const linkFor = (n: NotificationItem): string | null => {
    if (n.entity_type === "work_order" && n.entity_id) return `/work-orders/${n.entity_id}`;
    if (n.entity_type === "purchase_order" && n.entity_id) return `/purchase-orders/${n.entity_id}`;
    if (n.entity_type === "work_request" && n.entity_id) return `/requests/${n.entity_id}`;
    return null;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-[var(--card-border)] p-2 text-[var(--muted)] hover:bg-[var(--background)]/70 hover:text-[var(--foreground)]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-[360px] overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] px-3 py-2">
            <span className="text-sm font-semibold text-[var(--foreground)]">Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-[var(--muted)]">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--muted)]">No notifications</div>
            ) : (
              <ul className="divide-y divide-[var(--card-border)]">
                {notifications.map((n) => {
                  const href = linkFor(n);
                  const content = (
                    <>
                      <p className={`text-sm ${n.read_at ? "text-[var(--muted)]" : "font-medium text-[var(--foreground)]"}`}>
                        {n.title}
                      </p>
                      {n.message ? (
                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{n.message}</p>
                      ) : null}
                      <p className="mt-0.5 text-[10px] text-[var(--muted)]">{formatTime(n.created_at)}</p>
                    </>
                  );
                  return (
                    <li key={n.id}>
                      {href ? (
                        <Link
                          href={href}
                          onClick={() => {
                            if (!n.read_at) void handleMarkRead(n.id);
                            setOpen(false);
                          }}
                          className="block px-3 py-2 hover:bg-[var(--background)]/60"
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!n.read_at) void handleMarkRead(n.id);
                          }}
                          className="block w-full px-3 py-2 text-left hover:bg-[var(--background)]/60"
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
