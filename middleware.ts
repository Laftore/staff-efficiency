import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/env";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // === E2E Mock Auth: short-circuit before real Supabase check ===
  // This allows full E2E runs (including protected routes) without SERVICE_ROLE_KEY or real users.
  if (process.env.E2E_AUTH_MOCK === "1") {
    const hasE2ERole = request.cookies.has("e2e-test-role");
    if (hasE2ERole) {
      // Pretend we have a valid session — do not redirect, do not call Supabase in middleware.
      let response = NextResponse.next({ request });
      // Ensure the cookie is visible to server components (already is via storageState)
      return response;
    }
  }

  const { response, user } = await updateSession(request);

  if (!isSupabaseConfigured()) {
    return response;
  }

  if (isPublicRoute(pathname)) {
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
  ],
};
