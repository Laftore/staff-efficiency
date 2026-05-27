import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isDatabaseConfigured, isSupabaseConfigured } from "@/lib/env";
import type { AppRole, SessionUser } from "@/types";
import type { Role } from "@prisma/client";

/**
 * E2E Mock Auth (только для development/test)
 * Никогда не должен работать в production!
 */
function getMockSessionUser(): SessionUser | null {
  if (process.env.E2E_AUTH_MOCK !== "1" || process.env.NODE_ENV === "production") {
    return null;
  }

  try {
    // Note: cookies() is async in Next.js 15+
    // This function is called from getSessionUser which already awaits cookies()
    return null; // resolved in main function
  } catch {
    return null;
  }
}

function toAppRole(role: Role): AppRole {
  return role as AppRole;
}

/**
 * Resolves the current user from Supabase session + profiles table.
 *
 * SECURITY: Automatic profile creation is DISABLED.
 * New users must have their profile created through a controlled process
 * (e.g. admin panel, onboarding flow, or explicit API).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // === E2E Mock Auth (только dev/test) ===
  if (process.env.E2E_AUTH_MOCK === "1" && process.env.NODE_ENV !== "production") {
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
      // fall through to real auth
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

  // SECURITY: Automatic profile creation DISABLED
  // Previously: if (!profile && user.email) { create with role: "ADMIN" }
  // This was a major security hole - anyone who could sign up would get ADMIN role.
  if (!profile) {
    // Log for monitoring (in production this should go to proper logging service)
    console.warn(`[SECURITY] Profile not found for user ${user.id}. Access denied.`);
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
