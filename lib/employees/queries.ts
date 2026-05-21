import { branchScopeWhere } from "@/lib/auth/authorization";
import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import type { Prisma } from "@prisma/client";

export interface EmployeeFilters {
  branchId?: string;
}

export type EmployeeListItem = Prisma.EmployeeGetPayload<{
  include: {
    branch: { select: { id: true; name: true } };
    profile: { select: { id: true; email: true; displayName: true; role: true } };
    _count: { select: { shifts: true } };
  };
}>;

/**
 * Сотрудники с учётом роли и фильтра филиала.
 */
export async function listEmployees(
  user: SessionUser | null,
  filters: EmployeeFilters,
): Promise<EmployeeListItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const where: Prisma.EmployeeWhereInput = {};

  if (user) {
    Object.assign(where, branchScopeWhere(user, filters.branchId));
  } else if (filters.branchId) {
    where.branchId = filters.branchId;
  }

  return prisma.employee.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      profile: { select: { id: true, email: true, displayName: true, role: true } },
      _count: { select: { shifts: true } },
    },
    orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
  });
}
