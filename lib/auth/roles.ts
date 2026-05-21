import type { AppRole } from "@/types";

export const ROLES = ["OWNER", "SENIOR_ADMIN", "ADMIN"] as const satisfies readonly AppRole[];

/** Role hierarchy: higher index = more permissions. */
const ROLE_RANK: Record<AppRole, number> = {
  ADMIN: 0,
  SENIOR_ADMIN: 1,
  OWNER: 2,
};

/**
 * Returns true if `userRole` has at least the permissions of `requiredRole`.
 */
export function hasMinimumRole(userRole: AppRole, requiredRole: AppRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[requiredRole];
}

export function canResetBonus(role: AppRole): boolean {
  return hasMinimumRole(role, "SENIOR_ADMIN");
}

export function canAccessAllBranches(role: AppRole): boolean {
  return role === "OWNER";
}

export function canManageEmployees(role: AppRole): boolean {
  return hasMinimumRole(role, "SENIOR_ADMIN");
}

export function canManageBranches(role: AppRole): boolean {
  return role === "OWNER";
}
