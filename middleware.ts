import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/env";

const PUBLIC_ROUTES = ["/login", "/auth/callback", "/dev-login", "/api/dev-login"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // === E2E Mock Auth (БЕЗОПАСНЫЙ РЕЖИМ) ===
  // Работает ТОЛЬКО в development/test окружении.
  // Никогда не должен активироваться в production!
  if (process.env.E2E_AUTH_MOCK === "1" && process.env.NODE_ENV !== "production") {
    const hasE2ERole = request.cookies.has("e2e-test-role");
    if (hasE2ERole) {
      // В dev/test режиме разрешаем E2E-тесты без реальной аутентификации
      return NextResponse.next({ request });
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
