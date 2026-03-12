"use server";

/**
 * Returns the Mapbox access token from the server environment.
 * Used by the client so token detection doesn't rely on NEXT_PUBLIC_ inlining
 * (which can be stale with Turbopack/dev server cache).
 */
export async function getMapboxAccessToken(): Promise<string | null> {
  const token =
    (process.env.MAPBOX_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "").trim();
  return token || null;
}
