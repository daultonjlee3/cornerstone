/**
 * Re-export browser client for backward compatibility.
 * Prefer: import { createClient } from "@/src/lib/supabase/client" in Client Components,
 * or createClient() from "@/src/lib/supabase/server" in Server Components/Actions.
 */

export { createClient } from "./supabase/client";
