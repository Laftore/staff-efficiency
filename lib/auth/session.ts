import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isDatabaseConfigured, isSupabaseConfigured } from "@/lib/env";
import type { AppRole, SessionUser } from "@/types";
import type { Role } from "@prisma/client";

/** Test-only fast path for E2E (avoids real Supabase dependency). Activated via E2E_AUTH_MOCK=1 or when no real auth possible. */
function getMockSessionUser(): SessionUser | null {
  // In E2E we set this cookie from auth.setup.ts
  // (reading synchronously is not possible here; we read via next/headers below in the main function)
  return null; // resolved in main getSessionUser with cookie access
}

function toAppRole(role: Role): AppRole {
  return role as AppRole;
}

/**
 * Resolves the current user from Supabase session + `profiles` row.
 * Prisma uses service connection; access control is enforced here and via RLS on Supabase client.
 *
 * E2E support: when E2E_AUTH_MOCK=1 (or in CI/dev without SERVICE_ROLE_KEY), we use a fast
 * in-memory user derived from the `e2e-test-role` cookie set by auth.setup.ts.
 * This makes E2E tests reliable and fast without requiring real Supabase users or Service Role.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // === E2E Mock Auth Path (fast, no external dependencies) ===
  if (process.env.E2E_AUTH_MOCK === "1") {
    try {
      const cookieStore = await cookies();
      const role = (cookieStore.get("e2e-test-role")?.value as AppRole | undefined) ?? "ADMIN";
      const branchIdFromCookie = cookieStore.get("e2e-test-branch-id")?.value ?? null;

      const isOwner = role === "OWNER";
      return {
        id: isOwner ? "e2e-test-owner" : "e2e-test-admin",
        email: isOwner ? "owner@test.com" : "admin@test.com",
        role: isOwner ? "OWNER" : "ADMIN",
        branchId: isOwner ? null : (branchIdFromCookie || "branch_central"),
        displayName: isOwner ? "Test Owner (E2E)" : "Test Admin (E2E)",
      };
    } catch {
      // During static generation / edge cases — fall through
    }
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    return {
      id: user.id,
      email: user.email ?? "",
      role: "ADMIN",
      branchId: null,
      displayName: user.email?.split("@")[0] ?? "User",
    };
  }

  let profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: { branch: true },
  });

  if (!profile && user.email) {
    profile = await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name ?? user.email.split("@")[0],
        role: "ADMIN",
        branchId: (user.user_metadata?.branch_id as string | undefined) ?? null,
      },
      include: { branch: true },
    });
  }

  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    role: toAppRole(profile.role),
    branchId: profile.branchId,
    displayName: profile.displayName,
  };
}
