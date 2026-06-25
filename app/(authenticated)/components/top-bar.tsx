"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Bell,
  CloudSun,
  Command,
  Menu,
  TerminalSquare,
  Plus,
  Search,
  Sparkles,
  Wind,
} from "lucide-react";
import { SignOutButton } from "@/app/components/sign-out-button";
import { useGuidance } from "@/hooks/useGuidance";

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
  return "/operations";
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
  userName: string;
  onMenuClick: () => void;
  onOpenAiPanel?: () => void;
  isImpersonating?: boolean;
  onReturnToProfile?: () => void;
};

const RECENT_SEARCHES_KEY = "cornerstone:recent-searches";
const COMMAND_ACTIONS = [
  { label: "Open Dispatch Intelligence", href: "/dispatch" },
  { label: "Open Fleet Command Center", href: "/operations" },
  { label: "Open Fleet Performance", href: "/reports/operations" },
  { label: "Open Trucks Registry", href: "/fleet/trucks" },
  { label: "Open Operators Roster", href: "/fleet/operators" },
  { label: "Open Job Ledger", href: "/fleet/jobs" },
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
  }
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export function TopBar({
  tenantName,
  companyName,
  userName,
  onMenuClick,
  onOpenAiPanel,
  isImpersonating = false,
  onReturnToProfile,
}: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLiveDemoMode } = useGuidance();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [commandQuery, setCommandQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [weatherLabel, setWeatherLabel] = useState("Weather unavailable");
  const [branchHistory, setBranchHistory] = useState<string[]>([]);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const quickActionsRef = useRef<HTMLDivElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      setRecentSearches((prev) => {
        const next = [q, ...prev.filter((item) => item !== q)].slice(0, 8);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
        }
        return next;
      });
      router.push(`/dispatch?q=${encodeURIComponent(q)}`);
    },
    [searchQuery, router]
  );

  const initials = initialsFromName(userName);

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
    } catch (err) {
      // Network error, dev server restart, offline, etc. — don't crash the shell.
      if (process.env.NODE_ENV === "development") {
        console.debug("[top-bar] notifications fetch failed", err);
      }
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
    try {
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
    } catch {
      // ignore network failures
    }
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

  useEffect(() => {
    if (!quickActionsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
        setQuickActionsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [quickActionsOpen]);

  useEffect(() => {
    let cancelled = false;
    const loadWeather = async () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
            );
            if (!res.ok || cancelled) return;
            const data = (await res.json()) as {
              current?: { temperature_2m?: number; wind_speed_10m?: number };
            };
            const temp = data.current?.temperature_2m;
            const wind = data.current?.wind_speed_10m;
            if (temp == null || wind == null || cancelled) return;
            setWeatherLabel(`${Math.round(temp)}°F · ${Math.round(wind)} mph`);
          } catch {
            // Quiet fail: weather is additive only.
          }
        },
        () => {
          // Keep default label.
        },
        { timeout: 3500 }
      );
    };
    void loadWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((value): value is string => typeof value === "string").slice(0, 8));
      }
    } catch {
      // Ignore malformed storage state.
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isOpenShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isOpenShortcut) return;
      event.preventDefault();
      setCommandOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!commandOpen) return;
    const timeoutId = window.setTimeout(() => {
      commandInputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(timeoutId);
  }, [commandOpen]);

  const closeCommand = useCallback(() => {
    setCommandOpen(false);
    setCommandQuery("");
  }, []);

  const executeCommandSearch = useCallback(
    (value: string) => {
      const q = value.trim();
      if (!q) return;
      setRecentSearches((prev) => {
        const next = [q, ...prev.filter((item) => item !== q)].slice(0, 8);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
        }
        return next;
      });
      setSearchQuery(q);
      closeCommand();
      router.push(`/dispatch?q=${encodeURIComponent(q)}`);
    },
    [closeCommand, router]
  );

  const filteredCommandActions = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return COMMAND_ACTIONS;
    return COMMAND_ACTIONS.filter((item) => item.label.toLowerCase().includes(query));
  }, [commandQuery]);

  const filteredRecentSearches = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return recentSearches;
    return recentSearches.filter((item) => item.toLowerCase().includes(query));
  }, [commandQuery, recentSearches]);

  const branchId = useMemo(() => searchParams.get("branch_id")?.trim() ?? "", [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("cornerstone:recent-branches");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setBranchHistory(parsed.filter((value): value is string => typeof value === "string").slice(0, 6));
      }
    } catch {
      // Ignore malformed storage data.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !branchId) return;
    setBranchHistory((prev) => {
      const next = [branchId, ...prev.filter((id) => id !== branchId)].slice(0, 6);
      window.localStorage.setItem("cornerstone:recent-branches", JSON.stringify(next));
      return next;
    });
  }, [branchId]);

  const handleBranchChange = useCallback(
    (nextValue: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (nextValue === "all") next.delete("branch_id");
      else next.set("branch_id", nextValue);
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const opsStatus = unreadCount > 0 ? "Needs attention" : "Nominal";
  const opsStatusClass =
    unreadCount > 0 ? "text-[var(--status-warning)]" : "text-[var(--status-success)]";
  const branchOptions = branchId
    ? [branchId, ...branchHistory.filter((item) => item !== branchId)]
    : branchHistory;

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 9 ? "9+" : String(unreadCount);
  }, [unreadCount]);

  return (
    <header className="cs-command-topbar sticky top-0 z-30 shrink-0 px-3 pb-3 pt-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[var(--surface-border-subtle)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-default)] hover:text-[var(--foreground)] lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{tenantName}</p>
            <p className="truncate text-xs text-[var(--muted)]">{companyName}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:justify-center">
          <form onSubmit={handleSearchSubmit} className="w-full max-w-xl">
            <label htmlFor="topbar-search" className="sr-only">
              Global search
            </label>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                id="topbar-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Global search: jobs, trucks, operators, branches..."
                className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/75 pl-9 pr-14 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                aria-label="Global search"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[var(--surface-border-subtle)] bg-[var(--surface-default)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]"
                onClick={() => setCommandOpen(true)}
                aria-label="Open command search"
              >
                ⌘K
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 lg:flex">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Branch
            </label>
            <select
              value={branchId || "all"}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] px-2 text-xs text-[var(--foreground)]"
              aria-label="Branch selector"
            >
              <option value="all">All branches</option>
              {branchOptions.map((option) => (
                <option key={option} value={option}>
                  Branch {option.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div className="relative" ref={quickActionsRef}>
            <button
              type="button"
              onClick={() => setQuickActionsOpen((prev) => !prev)}
              className="flex size-9 items-center justify-center rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/65 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              aria-label="Quick actions"
            >
              <Plus className="size-4" />
            </button>
            {quickActionsOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] p-1 shadow-[var(--elevation-2)]">
                <Link
                  href="/dispatch"
                  onClick={() => setQuickActionsOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-default)]"
                >
                  Open Dispatch Board
                </Link>
                <Link
                  href="/operations"
                  onClick={() => setQuickActionsOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-default)]"
                >
                  View Command Center
                </Link>
                <Link
                  href="/reports/operations"
                  onClick={() => setQuickActionsOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-default)]"
                >
                  Open Fleet Performance
                </Link>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/65 px-2.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)] sm:inline-flex"
            aria-label="Open command search"
          >
            <TerminalSquare className="size-3.5" />
            Command
          </button>
          {onOpenAiPanel ? (
            <button
              type="button"
              onClick={onOpenAiPanel}
              className="hidden h-9 items-center gap-1.5 rounded-lg border border-[var(--brand-operational)]/35 bg-[var(--brand-operational-subtle)] px-3 text-xs font-semibold text-[var(--brand-operational)] transition-colors hover:brightness-110 sm:inline-flex"
            >
              <Sparkles className="size-3.5" />
              AI Copilot
            </button>
          ) : null}
        {isLiveDemoMode ? (
          <span className="hidden rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)] sm:inline-flex">
            Demo Workspace
          </span>
        ) : null}
        <div className="relative" ref={notificationPanelRef}>
          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/65 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            aria-label="Notifications"
            onClick={() => {
              setNotificationOpen((prev) => !prev);
              if (!notificationOpen) {
                void loadNotifications();
              }
            }}
          >
            {unreadLabel ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
                {unreadLabel}
              </span>
            ) : null}
            <Bell className="size-4" />
          </button>
          {notificationOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-96 max-w-[90vw] rounded-[var(--radius-card)] border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] shadow-[var(--elevation-2)]">
              <div className="flex items-center justify-between border-b border-[var(--surface-border-subtle)] px-3 py-2">
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
                  <ul className="divide-y divide-[var(--surface-border-subtle)]">
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
                          className={`block px-3 py-3 hover:bg-[var(--surface-default)] ${
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
          <p className="text-xs font-medium text-[var(--foreground)]">{userName}</p>
          <p className="text-xs text-[var(--muted)]">{companyName}</p>
        </div>
        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((o) => !o)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--brand-operational)]/30 bg-[var(--brand-operational-subtle)] text-xs font-semibold text-[var(--brand-operational)] hover:opacity-90"
            aria-expanded={accountOpen}
            aria-haspopup="true"
            aria-label="Account menu"
          >
            {initials}
          </button>
          {accountOpen ? (
            <div
              className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] rounded-xl border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] py-1 shadow-[var(--elevation-2)]"
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
                className={`px-3 py-2 ${isImpersonating ? "border-t border-[var(--surface-border-subtle)]" : ""}`}
              >
                <SignOutButton />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </div>
      <div className="mt-3 cs-command-strip">
        <div className="cs-command-strip__item">
          <p className="cs-command-strip__label">Operational status</p>
          <p className={`cs-command-strip__value inline-flex items-center gap-1.5 ${opsStatusClass}`}>
            <Activity className="size-3.5" />
            {opsStatus}
          </p>
        </div>
        <div className="cs-command-strip__item">
          <p className="cs-command-strip__label">Workspace</p>
          <p className="cs-command-strip__value">{tenantName}</p>
        </div>
        <div className="cs-command-strip__item">
          <p className="cs-command-strip__label">Weather</p>
          <p className="cs-command-strip__value inline-flex items-center gap-1.5">
            <CloudSun className="size-3.5 text-[var(--status-info)]" />
            {weatherLabel}
          </p>
        </div>
        <div className="cs-command-strip__item">
          <p className="cs-command-strip__label">Wind / mode</p>
          <p className="cs-command-strip__value inline-flex items-center gap-1.5">
            <Wind className="size-3.5 text-[var(--text-muted)]" />
            Mission Control
            <Command className="size-3.5 text-[var(--text-muted)]" />
          </p>
        </div>
      </div>
      {commandOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center bg-black/50 px-4 pt-20 backdrop-blur-sm"
          onClick={closeCommand}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)] shadow-[var(--elevation-3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[var(--surface-border-subtle)] px-3 py-2">
              <Command className="size-4 text-[var(--muted)]" />
              <input
                ref={commandInputRef}
                type="text"
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeCommand();
                  if (event.key === "Enter") {
                    event.preventDefault();
                    executeCommandSearch(commandQuery);
                  }
                }}
                placeholder="Search jobs, trucks, operators..."
                className="h-10 w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
                aria-label="Command search"
              />
              <button
                type="button"
                className="rounded border border-[var(--surface-border-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]"
                onClick={closeCommand}
              >
                ESC
              </button>
            </div>

            <div className="grid gap-3 p-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/70 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Recent searches
                </p>
                {filteredRecentSearches.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">No recent searches.</p>
                ) : (
                  <ul className="space-y-1">
                    {filteredRecentSearches.slice(0, 5).map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-default)]"
                          onClick={() => executeCommandSearch(item)}
                        >
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/70 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Operational shortcuts
                </p>
                {filteredCommandActions.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">No matching shortcuts.</p>
                ) : (
                  <ul className="space-y-1">
                    {filteredCommandActions.slice(0, 6).map((item) => (
                      <li key={item.href}>
                        <button
                          type="button"
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-default)]"
                          onClick={() => {
                            closeCommand();
                            router.push(item.href);
                          }}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--surface-border-subtle)] px-3 py-2 text-[11px] text-[var(--muted)]">
              Enter to search · Ctrl/Cmd+K to reopen · ESC to close
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
