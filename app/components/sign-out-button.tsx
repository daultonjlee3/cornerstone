"use client";

import { signOutAction } from "@/app/(authenticated)/dashboard/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
      >
        Sign out
      </button>
    </form>
  );
}
