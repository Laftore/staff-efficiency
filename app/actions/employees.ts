"use server";

import { revalidatePath } from "next/cache";
import {
  assertBranchAccess,
  AuthorizationError,
  requireUser,
} from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/auth/session";
import { canManageEmployees } from "@/lib/auth/roles";
import type { AppRole } from "@/types";
import {
  assertProfileAvailableForEmployee,
  findProfileByEmail,
} from "@/lib/employees/profiles";
import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  employeeFormSchema,
  normalizeEmployeeForm,
  updateEmployeeSchema,
  type EmployeeFormValues,
  type UpdateEmployeeValues,
} from "@/lib/validations/employee";

export type EmployeeActionResult = { error?: string; success?: boolean };

function assertCanManageEmployees(role: AppRole): void {
  if (!canManageEmployees(role)) {
    throw new AuthorizationError("Недостаточно прав для управления сотрудниками");
  }
}

async function resolveProfileLink(profileEmail: string | undefined) {
  if (!profileEmail) {
    return null;
  }
  const profile = await findProfileByEmail(profileEmail);
  if (!profile) {
    throw new Error(
      "Профиль с таким email не найден. Создайте пользователя в Supabase Auth — профиль появится при первом входе.",
    );
  }
  if (profile.role === "OWNER") {
    throw new Error("Нельзя привязать сотрудника к профилю владельца");
  }
  return profile;
}

export async function createEmployee(
  input: EmployeeFormValues,
): Promise<EmployeeActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  try {
    const user = await getSessionUser();
    requireUser(user);
    assertCanManageEmployees(user.role);

    const parsed = employeeFormSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
    }

    const data = normalizeEmployeeForm(parsed.data);
    const { name, role, branchId, profileEmail } = data;
    assertBranchAccess(user, branchId);

    const profile = await resolveProfileLink(profileEmail);
    if (profile) {
      await assertProfileAvailableForEmployee(profile.id);
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee.create({
        data: {
          name,
          branchId,
          profileId: profile?.id ?? null,
        },
      });

      if (profile) {
        await tx.profile.update({
          where: { id: profile.id },
          data: { role, branchId },
        });
      }
    });

    revalidatePath("/employees");
    revalidatePath("/shifts");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { error: e.message };
    }
    if (e instanceof Error) {
      return { error: e.message };
    }
    console.error(e);
    return { error: "Не удалось создать сотрудника" };
  }
}

export async function updateEmployee(
  input: UpdateEmployeeValues,
): Promise<EmployeeActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  try {
    const user = await getSessionUser();
    requireUser(user);
    assertCanManageEmployees(user.role);

    const parsed = updateEmployeeSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
    }

    const { id, ...rest } = parsed.data;
    const { name, role, branchId, profileEmail } = normalizeEmployeeForm(rest);
    assertBranchAccess(user, branchId);

    const existing = await prisma.employee.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!existing) {
      return { error: "Сотрудник не найден" };
    }
    assertBranchAccess(user, existing.branchId);

    const newProfile = await resolveProfileLink(profileEmail);

    if (newProfile) {
      await assertProfileAvailableForEmployee(newProfile.id, id);
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: {
          name,
          branchId,
          profileId: newProfile?.id ?? null,
        },
      });

      if (newProfile) {
        await tx.profile.update({
          where: { id: newProfile.id },
          data: { role, branchId },
        });
      }
    });

    revalidatePath("/employees");
    revalidatePath("/shifts");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { error: e.message };
    }
    if (e instanceof Error) {
      return { error: e.message };
    }
    console.error(e);
    return { error: "Не удалось обновить сотрудника" };
  }
}
