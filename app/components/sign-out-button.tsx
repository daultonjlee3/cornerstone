"use client";

import { signOutAction } from "@/app/(authenticated)/dashboard/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--card-border)] hover:text-[var(--foreground)]"
      >
        Sign out
      </button>
    </form>
  );
}
