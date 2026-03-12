import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Returns the Mapbox access token from server env (.env.local).
 * Single reliable source for the address autocomplete component.
 */
export async function GET() {
  const token =
    (process.env.MAPBOX_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "").trim();
  return NextResponse.json({ token: token || null });
}
