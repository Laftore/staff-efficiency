"use server";

import { revalidatePath } from "next/cache";
import { AuthorizationError, requireUser } from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/auth/session";
import { canManageBranches } from "@/lib/auth/roles";
import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  branchFormSchema,
  normalizeBranchForm,
  updateBranchSchema,
  type BranchFormValues,
  type UpdateBranchValues,
} from "@/lib/validations/branch";
import type { AppRole } from "@/types";
import { Prisma } from "@prisma/client";

export type BranchActionResult = { error?: string; success?: boolean };

function assertOwner(role: AppRole): void {
  if (!canManageBranches(role)) {
    throw new AuthorizationError("Управление филиалами доступно только владельцу");
  }
}

export async function createBranch(input: BranchFormValues): Promise<BranchActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  try {
    const user = await getSessionUser();
    requireUser(user);
    assertOwner(user.role);

    const parsed = branchFormSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
    }

    const { name, address } = normalizeBranchForm(parsed.data);

    await prisma.branch.create({
      data: { name, address },
    });

    revalidatePath("/branches");
    revalidatePath("/employees");
    revalidatePath("/shifts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { error: e.message };
    }
    console.error(e);
    return { error: "Не удалось создать филиал" };
  }
}

export async function updateBranch(input: UpdateBranchValues): Promise<BranchActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  try {
    const user = await getSessionUser();
    requireUser(user);
    assertOwner(user.role);

    const parsed = updateBranchSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
    }

    const { id, ...rest } = parsed.data;
    const { name, address } = normalizeBranchForm(rest);

    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Филиал не найден" };
    }

    await prisma.branch.update({
      where: { id },
      data: { name, address },
    });

    revalidatePath("/branches");
    revalidatePath("/employees");
    revalidatePath("/shifts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { error: e.message };
    }
    console.error(e);
    return { error: "Не удалось обновить филиал" };
  }
}

export async function deleteBranch(branchId: string): Promise<BranchActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  try {
    const user = await getSessionUser();
    requireUser(user);
    assertOwner(user.role);

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        _count: {
          select: { employees: true, shifts: true, profiles: true },
        },
      },
    });

    if (!branch) {
      return { error: "Филиал не найден" };
    }

    const { employees, shifts, profiles } = branch._count;
    if (employees > 0 || shifts > 0 || profiles > 0) {
      const parts: string[] = [];
      if (employees > 0) parts.push(`${employees} сотрудников`);
      if (shifts > 0) parts.push(`${shifts} смен`);
      if (profiles > 0) parts.push(`${profiles} профилей`);
      return {
        error: `Нельзя удалить филиал: привязаны ${parts.join(", ")}. Сначала перенесите или удалите связанные данные.`,
      };
    }

    await prisma.branch.delete({ where: { id: branchId } });

    revalidatePath("/branches");
    revalidatePath("/employees");
    revalidatePath("/shifts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { error: e.message };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return { error: "Нельзя удалить филиал: есть связанные записи в базе" };
    }
    console.error(e);
    return { error: "Не удалось удалить филиал" };
  }
}
