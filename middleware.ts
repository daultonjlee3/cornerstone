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
  "/platform",
  "/settings",
];
const authPaths = ["/login", "/signup"];

function isProtected(pathname: string) {
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
function isAuthPath(pathname: string) {
  return authPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
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

  if (isProtected(request.nextUrl.pathname) && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  if (isAuthPath(request.nextUrl.pathname) && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
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
    "/platform",
    "/platform/:path*",
    "/settings",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
