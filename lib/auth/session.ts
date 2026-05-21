import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isDatabaseConfigured, isSupabaseConfigured } from "@/lib/env";
import type { AppRole, SessionUser } from "@/types";
import type { Role } from "@prisma/client";

function toAppRole(role: Role): AppRole {
  return role as AppRole;
}

/**
 * Resolves the current user from Supabase session + `profiles` row.
 * Prisma uses service connection; access control is enforced here and via RLS on Supabase client.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
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
