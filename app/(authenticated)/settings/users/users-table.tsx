"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startImpersonationTenant } from "@/app/platform/impersonate/actions";

type MemberRow = {
  userId: string;
  fullName: string;
  role: string;
  isPlatformSuperAdmin: boolean;
};

export function UsersTable({
  members,
  canImpersonate,
}: {
  members: MemberRow[];
  canImpersonate: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImpersonate(userId: string) {
    setLoadingId(userId);
    setError(null);
    const err = await startImpersonationTenant(userId);
    if (err) {
      setError(err);
      setLoadingId(null);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const roleLabel: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
    viewer: "Viewer",
  };

  return (
    <div className="space-y-2">
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-[var(--muted)]">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-[var(--card-border)] last:border-0">
                <td className="py-2 pr-4 font-medium text-[var(--foreground)]">{m.fullName}</td>
                <td className="py-2 pr-4 text-[var(--muted)]">{roleLabel[m.role] ?? m.role}</td>
                <td className="py-2">
                  {m.isPlatformSuperAdmin ? (
                    <span className="text-xs text-[var(--muted)]">Platform super admin</span>
                  ) : canImpersonate ? (
                    <button
                      type="button"
                      onClick={() => void handleImpersonate(m.userId)}
                      disabled={loadingId !== null}
                      className="rounded border border-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-50"
                    >
                      {loadingId === m.userId ? "…" : "Impersonate"}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
