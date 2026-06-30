/** Client-side hook-up after magic-link / OAuth session is stored in cookies. */
export async function establishClientAuthSession(): Promise<void> {
  try {
    await fetch("/api/auth/establish-session", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // Non-fatal; password login establishes session on the server.
  }
}
