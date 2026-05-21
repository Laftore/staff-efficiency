import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * Ищет профиль Supabase Auth по email (без учёта регистра).
 */
export async function findProfileByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return prisma.profile.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
}

/**
 * Проверяет, что профиль не привязан к другому сотруднику.
 */
export async function assertProfileAvailableForEmployee(
  profileId: string,
  excludeEmployeeId?: string,
): Promise<void> {
  const existing = await prisma.employee.findFirst({
    where: {
      profileId,
      ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
    },
  });
  if (existing) {
    throw new Error("Этот профиль уже привязан к другому сотруднику");
  }
}

export type AssignableEmployeeRole = Extract<Role, "ADMIN" | "SENIOR_ADMIN">;
