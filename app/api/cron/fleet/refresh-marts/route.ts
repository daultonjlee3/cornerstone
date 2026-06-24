import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import {
  defaultMartRefreshDateRange,
  refreshUtilizationDailyForAllTenants,
} from "@/src/lib/fleet/marts/refresh-utilization-daily";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  const bearer = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const fromParam = url.searchParams.get("from")?.trim();
    const toParam = url.searchParams.get("to")?.trim();
    const { from: defaultFrom, to: defaultTo } = defaultMartRefreshDateRange();
    const from = fromParam || defaultFrom;
    const to = toParam || defaultTo;

    const supabase = createAdminClient();
    const results = await refreshUtilizationDailyForAllTenants(supabase, from, to);

    return NextResponse.json({
      ok: true,
      from,
      to,
      tenantsProcessed: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
