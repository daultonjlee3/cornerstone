/**
 * Refreshes Supabase session and protects dashboard/onboarding routes.
 * - Unauthenticated users hitting /dashboard or /onboarding → redirect to /login
 * - Authenticated users hitting /login or /signup → redirect to /dashboard
 *   (dashboard layout will redirect to /onboarding if user has no tenant)
 */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/onboarding",
  "/portal",
  "/companies",
  "/properties",
  "/buildings",
  "/units",
  "/assets",
  "/work-orders",
  "/technician",
  "/technicians",
  "/customers",
  "/products",
  "/inventory",
  "/purchase-orders",
  "/crews",
  "/dispatch",
  "/preventive-maintenance",
];
const authPaths = ["/login", "/signup"];
const IMPERSONATION_COOKIE = "cs_impersonation";

function isProtected(pathname: string) {
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
function isAuthPath(pathname: string) {
  return authPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isPortalPath(pathname: string) {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

function parseImpersonationCookie(rawValue: string | undefined): { admin_user_id: string } | null {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue) as { admin_user_id?: string };
    if (!parsed?.admin_user_id) return null;
    return { admin_user_id: parsed.admin_user_id };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (isProtected(pathname) && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (!user) {
    return response;
  }

  const impersonationCookie = parseImpersonationCookie(
    request.cookies.get(IMPERSONATION_COOKIE)?.value
  );
  const isImpersonating = impersonationCookie?.admin_user_id === user.id;

  const { data: profile } = await supabase
    .from("users")
    .select("is_portal_only")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();
  const isPortalOnly = Boolean((profile as { is_portal_only?: boolean | null } | null)?.is_portal_only);
  const portalActor = isPortalOnly || isImpersonating;

  if (pathname === "/technician" || pathname.startsWith("/technician/")) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  if (isAuthPath(pathname)) {
    return NextResponse.redirect(new URL(portalActor ? "/portal" : "/dashboard", request.url));
  }

  if (portalActor && isProtected(pathname) && !isPortalPath(pathname)) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  if (!portalActor && isPortalPath(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/portal",
    "/portal/:path*",
    "/companies",
    "/companies/:path*",
    "/properties",
    "/properties/:path*",
    "/buildings",
    "/buildings/:path*",
    "/units",
    "/units/:path*",
    "/assets",
    "/assets/:path*",
    "/work-orders",
    "/work-orders/:path*",
    "/technician",
    "/technician/:path*",
    "/technicians",
    "/technicians/:path*",
    "/customers",
    "/customers/:path*",
    "/products",
    "/products/:path*",
    "/inventory",
    "/inventory/:path*",
    "/purchase-orders",
    "/purchase-orders/:path*",
    "/crews",
    "/crews/:path*",
    "/dispatch",
    "/dispatch/:path*",
    "/preventive-maintenance",
    "/preventive-maintenance/:path*",
    "/login",
    "/signup",
  ],
};
