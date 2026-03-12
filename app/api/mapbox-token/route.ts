import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Mapbox public tokens start with this prefix; secret tokens start with sk. */
const PUBLIC_TOKEN_PREFIX = "pk.";

/**
 * Returns the Mapbox access token from server env (.env.local).
 * Uses NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN only. Returns null if the value is missing
 * or does not look like a public token (pk.*), so the client never receives a
 * secret token or a bad value that could overwrite a valid one.
 */
export async function GET() {
  const raw = (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "").trim();
  const token = raw && raw.startsWith(PUBLIC_TOKEN_PREFIX) ? raw : null;
  return NextResponse.json({ token });
}
