import { NextResponse } from "next/server";
import { resolveMapboxPublicTokenFromEnv } from "@/src/lib/mapbox-token";

export const runtime = "nodejs";

/**
 * Returns a public Mapbox token from env.
 * Checks common variable names and only returns pk.* values.
 */
export async function GET() {
  const token = resolveMapboxPublicTokenFromEnv();
  return NextResponse.json({ token });
}
