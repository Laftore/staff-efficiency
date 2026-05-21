import { prisma } from "@/lib/prisma";
import { branchScopeWhere } from "@/lib/auth/authorization";
import { canAccessAllBranches } from "@/lib/auth/roles";
import { isDatabaseConfigured } from "@/lib/env";
import type { SessionUser } from "@/types";
import type { Prisma, ShiftType } from "@prisma/client";

export interface ShiftFilters {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type ShiftListItem = Prisma.ShiftGetPayload<{
  include: {
    employee: { select: { id: true; name: true; profileId: true } };
    branch: { select: { id: true; name: true } };
  };
}>;

function parseFilterDate(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

/**
 * Смены с учётом роли и фильтров филиала / даты.
 */
export async function listShifts(
  user: SessionUser | null,
  filters: ShiftFilters,
): Promise<ShiftListItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const where: Prisma.ShiftWhereInput = {};

  if (user) {
    Object.assign(where, branchScopeWhere(user, filters.branchId));

    if (user.role === "ADMIN") {
      where.employee = { profileId: user.id };
    }
  } else if (filters.branchId) {
    where.branchId = filters.branchId;
  }

  const from = parseFilterDate(filters.dateFrom, false);
  const to = parseFilterDate(filters.dateTo, true);
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  }

  return prisma.shift.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, profileId: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export async function listBranchesForUser(user: SessionUser | null) {
  if (!isDatabaseConfigured()) {
    return [];
  }
  if (!user || canAccessAllBranches(user.role)) {
    return prisma.branch.findMany({ orderBy: { name: "asc" } });
  }
  if (!user.branchId) {
    return [];
  }
  return prisma.branch.findMany({
    where: { id: user.branchId },
    orderBy: { name: "asc" },
  });
}

export async function listEmployeesForBranch(branchId: string) {
  if (!isDatabaseConfigured()) {
    return [];
  }
  return prisma.employee.findMany({
    where: { branchId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, branchId: true },
  });
}

export async function getShiftById(id: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }
  return prisma.shift.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, profileId: true } },
      branch: { select: { id: true, name: true } },
    },
  });
}

export function shiftTypeFromDb(type: string): ShiftType {
  return type as ShiftType;
}
