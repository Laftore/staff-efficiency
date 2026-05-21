import type { AppRole, SessionUser } from "@/types";
import { canAccessAllBranches, hasMinimumRole } from "@/lib/auth/roles";

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Ensures user is authenticated. */
export function requireUser(user: SessionUser | null): asserts user is SessionUser {
  if (!user) {
    throw new AuthorizationError("Требуется авторизация");
  }
}

/** OWNER or matching branch_id (tenant). */
export function assertBranchAccess(user: SessionUser, branchId: string): void {
  if (canAccessAllBranches(user.role)) {
    return;
  }
  if (user.branchId !== branchId) {
    throw new AuthorizationError("Нет доступа к этому филиалу");
  }
}

export function requireRole(user: SessionUser, minimumRole: AppRole): void {
  if (!hasMinimumRole(user.role, minimumRole)) {
    throw new AuthorizationError("Недостаточно прав");
  }
}

/**
 * Prisma WHERE fragment scope for multi-branch queries.
 * OWNER: optional branch filter; others: forced to their branch.
 */
export function branchScopeWhere(
  user: SessionUser,
  branchId?: string,
): { branchId: string } | { branchId?: string } {
  if (canAccessAllBranches(user.role)) {
    return branchId ? { branchId } : {};
  }
  if (!user.branchId) {
    throw new AuthorizationError("У пользователя не назначен филиал");
  }
  return { branchId: user.branchId };
}
