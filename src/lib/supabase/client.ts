/**
 * Supabase browser client for Client Components.
 * Uses @supabase/ssr for cookie-based session handling in the browser.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createBrowserClient(url, key);
}
