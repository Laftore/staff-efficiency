"use server";

import { revalidatePath } from "next/cache";
import {
  assertBranchAccess,
  AuthorizationError,
  requireUser,
} from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/auth/session";
import { canResetBonus } from "@/lib/auth/roles";
import { calculateShiftBonus, getStoredBonusValue } from "@/lib/kpi/bonus";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/env";
import { shiftFormSchema, updateShiftSchema } from "@/lib/validations/shift";
import type { ShiftType } from "@/types";

// VK Bot уведомления (fire-and-forget)
import {
  notifyNewShiftCreated,
  notifyBonusNeedsReset,
  notifyBonusWasReset,
} from "@/lib/vk/notifications";

export type ShiftActionResult = { error?: string; success?: boolean };

function formDataToObject(formData: FormData): Record<string, unknown> {
  return {
    id: formData.get("id") ?? undefined,
    branchId: formData.get("branchId"),
    employeeId: formData.get("employeeId"),
    date: formData.get("date"),
    type: formData.get("type"),
    revenueTariff: formData.get("revenueTariff"),
    revenueGoods: formData.get("revenueGoods"),
    bonusAdjustment: formData.get("bonusAdjustment") ?? "0",
  };
}

async function assertEmployeeInBranch(employeeId: string, branchId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, branchId },
  });
  if (!employee) {
    throw new AuthorizationError("Сотрудник не найден в выбранном филиале");
  }
  return employee;
}

async function assertAdminOwnsEmployee(
  userId: string,
  employeeId: string,
): Promise<void> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, profileId: userId },
  });
  if (!employee) {
    throw new AuthorizationError("Можно работать только со своими сменами");
  }
}

function resolveBonus(
  revenueTariff: number,
  revenueGoods: number,
  type: ShiftType,
  bonusAdjustment: number,
  bonusManualReset: boolean,
) {
  const result = calculateShiftBonus({
    revenueTariff,
    revenueGoods,
    shiftType: type,
    bonusAdjustment,
    bonusManualReset,
  });
  return {
    bonus: getStoredBonusValue(result),
    needsReset: result.needsReset,
  };
}

export async function saveShift(
  _prev: ShiftActionResult | null,
  formData: FormData,
): Promise<ShiftActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  try {
    const user = await getSessionUser();
    requireUser(user);

    const raw = formDataToObject(formData);
    const isUpdate = Boolean(raw.id && String(raw.id).length > 0);

    if (isUpdate) {
      const parsed = updateShiftSchema.safeParse(raw);
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
      }
      const data = parsed.data;
      assertBranchAccess(user, data.branchId);

      if (user.role === "ADMIN") {
        await assertAdminOwnsEmployee(user.id, data.employeeId);
      }

      await assertEmployeeInBranch(data.employeeId, data.branchId);

      const existing = await prisma.shift.findUnique({ where: { id: data.id } });
      if (!existing) {
        return { error: "Смена не найдена" };
      }
      assertBranchAccess(user, existing.branchId);
      if (user.role === "ADMIN") {
        await assertAdminOwnsEmployee(user.id, existing.employeeId);
      }

      const { bonus } = resolveBonus(
        data.revenueTariff,
        data.revenueGoods,
        data.type,
        data.bonusAdjustment,
        existing.bonusManualReset,
      );

      await prisma.shift.update({
        where: { id: data.id },
        data: {
          branchId: data.branchId,
          employeeId: data.employeeId,
          date: data.date,
          type: data.type,
          revenueTariff: data.revenueTariff,
          revenueGoods: data.revenueGoods,
          bonusAdjustment: data.bonusAdjustment,
          bonus,
        },
      });

      revalidatePath("/shifts");
      return { success: true };
    }

    const parsed = shiftFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
    }

    const data = parsed.data;
    assertBranchAccess(user, data.branchId);

    if (user.role === "ADMIN") {
      await assertAdminOwnsEmployee(user.id, data.employeeId);
    }

    await assertEmployeeInBranch(data.employeeId, data.branchId);

    const { bonus, needsReset } = resolveBonus(
      data.revenueTariff,
      data.revenueGoods,
      data.type,
      data.bonusAdjustment,
      false,
    );

    const createdShift = await prisma.shift.create({
      data: {
        branchId: data.branchId,
        employeeId: data.employeeId,
        date: data.date,
        type: data.type,
        revenueTariff: data.revenueTariff,
        revenueGoods: data.revenueGoods,
        bonusAdjustment: data.bonusAdjustment,
        bonus,
        bonusManualReset: false,
      },
    });

    revalidatePath("/shifts");

    // === VK Bot уведомления (fire-and-forget) ===
    // Не блокируем ответ пользователю при проблемах с VK
    notifyNewShiftCreated(createdShift.id).catch((err) => {
      console.error("[VK] notifyNewShiftCreated failed:", err);
    });

    if (needsReset) {
      notifyBonusNeedsReset(createdShift.id).catch((err) => {
        console.error("[VK] notifyBonusNeedsReset failed:", err);
      });
    }

    return { success: true };
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { error: e.message };
    }
    console.error(e);
    return { error: "Не удалось сохранить смену" };
  }
}

export async function resetShiftBonus(shiftId: string): Promise<ShiftActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  try {
    const user = await getSessionUser();
    requireUser(user);

    if (!canResetBonus(user.role)) {
      return { error: "Недостаточно прав для обнуления бонуса" };
    }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) {
      return { error: "Смена не найдена" };
    }

    assertBranchAccess(user, shift.branchId);

    await prisma.shift.update({
      where: { id: shiftId },
      data: {
        bonusManualReset: true,
        bonus: 0,
      },
    });

    revalidatePath("/shifts");

    // === VK Bot уведомление (fire-and-forget) ===
    notifyBonusWasReset(shiftId).catch((err) => {
      console.error("[VK] notifyBonusWasReset failed:", err);
    });

    return { success: true };
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { error: e.message };
    }
    return { error: "Не удалось обнулить бонус" };
  }
}
