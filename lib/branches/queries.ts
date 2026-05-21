import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type BranchListItem = Prisma.BranchGetPayload<{
  include: {
    _count: {
      select: { employees: true; shifts: true; profiles: true };
    };
  };
}>;

/**
 * Все филиалы с количеством связанных записей (для страницы владельца).
 */
export async function listBranchesWithCounts(): Promise<BranchListItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  return prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { employees: true, shifts: true, profiles: true },
      },
    },
  });
}
