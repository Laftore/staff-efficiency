import { prisma } from "@/lib/prisma";
import {
  assertBranchAccess,
  AuthorizationError,
  requireUser,
} from "@/lib/auth/authorization";
import { canResetBonus } from "@/lib/auth/roles";
import { calculateShiftBonus, getStoredBonusValue } from "@/lib/kpi/bonus";
import { logAction, AuditAction } from "@/lib/audit/audit.service";
import { isFeatureEnabled } from "@/lib/feature-flags/feature-flags.service";
import type { SessionUser } from "@/types";
import type { ShiftType } from "@/types";

/**
 * Тип входных данных для создания/обновления смены
 * (уже провалидированные на уровне Action)
 */
export interface ShiftInput {
  id?: string;
  branchId: string;
  employeeId: string;
  date: Date;
  type: ShiftType;
  revenueTariff: number;
  revenueGoods: number;
  bonusAdjustment: number;
}

/**
 * Внутренняя helper-функция: проверяет, что сотрудник принадлежит указанному филиалу.
 */
async function assertEmployeeInBranch(employeeId: string, branchId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, branchId },
  });
  if (!employee) {
    throw new AuthorizationError("Сотрудник не найден в выбранном филиале");
  }
  return employee;
}

/**
 * Внутренняя helper-функция: проверяет, что ADMIN работает только со своими сменами/сотрудниками.
 */
async function assertAdminOwnsEmployee(userId: string, employeeId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, profileId: userId },
  });
  if (!employee) {
    throw new AuthorizationError("Можно работать только со своими сменами");
  }
}

/**
 * Создание новой смены.
 */
export async function createShift(
  user: SessionUser,
  input: ShiftInput
): Promise<{ success: true; shiftId: string; needsReset: boolean }> {
  requireUser(user);

  assertBranchAccess(user, input.branchId);

  if (user.role === "ADMIN") {
    await assertAdminOwnsEmployee(user.id, input.employeeId);
  }

  await assertEmployeeInBranch(input.employeeId, input.branchId);

  const bonusResult = calculateShiftBonus({
    revenueTariff: input.revenueTariff,
    revenueGoods: input.revenueGoods,
    shiftType: input.type,
    bonusAdjustment: input.bonusAdjustment,
    bonusManualReset: false,
  });

  const bonus = getStoredBonusValue(bonusResult);

  const created = await prisma.shift.create({
    data: {
      branchId: input.branchId,
      employeeId: input.employeeId,
      date: input.date,
      type: input.type,
      revenueTariff: input.revenueTariff,
      revenueGoods: input.revenueGoods,
      bonusAdjustment: input.bonusAdjustment,
      bonus,
      bonusManualReset: false,
    },
    select: { id: true },
  });

  await logAction({
    user,
    action: AuditAction.SHIFT_CREATED,
    entityType: "SHIFT",
    entityId: created.id,
    branchId: input.branchId,
    details: {
      employeeId: input.employeeId,
      type: input.type,
      revenueTariff: input.revenueTariff,
      revenueGoods: input.revenueGoods,
    },
  });

  return {
    success: true,
    shiftId: created.id,
    needsReset: bonusResult.needsReset,
  };
}

/**
 * Обновление существующей смены.
 */
export async function updateShift(
  user: SessionUser,
  input: ShiftInput & { id: string }
): Promise<{ success: true }> {
  requireUser(user);

  assertBranchAccess(user, input.branchId);

  if (user.role === "ADMIN") {
    await assertAdminOwnsEmployee(user.id, input.employeeId);
  }

  await assertEmployeeInBranch(input.employeeId, input.branchId);

  const existing = await prisma.shift.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new AuthorizationError("Смена не найдена");
  }

  assertBranchAccess(user, existing.branchId);

  if (user.role === "ADMIN") {
    await assertAdminOwnsEmployee(user.id, existing.employeeId);
  }

  const bonusResult = calculateShiftBonus({
    revenueTariff: input.revenueTariff,
    revenueGoods: input.revenueGoods,
    shiftType: input.type,
    bonusAdjustment: input.bonusAdjustment,
    bonusManualReset: existing.bonusManualReset,
  });

  const bonus = getStoredBonusValue(bonusResult);

  await prisma.shift.update({
    where: { id: input.id },
    data: {
      branchId: input.branchId,
      employeeId: input.employeeId,
      date: input.date,
      type: input.type,
      revenueTariff: input.revenueTariff,
      revenueGoods: input.revenueGoods,
      bonusAdjustment: input.bonusAdjustment,
      bonus,
    },
  });

  await logAction({
    user,
    action: AuditAction.SHIFT_UPDATED,
    entityType: "SHIFT",
    entityId: input.id,
    branchId: input.branchId,
    details: {
      employeeId: input.employeeId,
      type: input.type,
    },
  });

  return { success: true };
}

export type ResetBonusResult =
  | { success: true }
  | { requiresConfirmation: true };

/**
 * Обнуление бонуса (только SENIOR_ADMIN и OWNER).
 *
 * Если включён флаг BONUS_RESET_CONFIRMATION — функция не выполняет сброс,
 * а возвращает { requiresConfirmation: true }, чтобы фронтенд мог показать
 * дополнительное подтверждение.
 */
export async function resetShiftBonus(
  user: SessionUser,
  shiftId: string
): Promise<ResetBonusResult> {
  requireUser(user);

  if (!canResetBonus(user.role)) {
    throw new AuthorizationError("Недостаточно прав для обнуления бонуса");
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) {
    throw new AuthorizationError("Смена не найдена");
  }

  assertBranchAccess(user, shift.branchId);

  const confirmationRequired = await isFeatureEnabled(
    "BONUS_RESET_CONFIRMATION",
    shift.branchId
  );

  if (confirmationRequired) {
    // Флаг включён — требуем подтверждение от фронтенда.
    // Реальный сброс не выполняется; фронтенд должен показать диалог подтверждения
    // и при подтверждении вызвать отдельный эндпоинт (будущая доработка).
    return { requiresConfirmation: true };
  }

  // Флаг выключен — выполняем сброс как обычно
  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      bonusManualReset: true,
      bonus: 0,
    },
  });

  // Логируем важное действие
  await logAction({
    user,
    action: AuditAction.SHIFT_BONUS_RESET,
    entityType: "SHIFT",
    entityId: shiftId,
    branchId: shift.branchId,
    details: {
      previousBonus: shift.bonus,
      newBonus: 0,
      manualReset: true,
      confirmationRequired: false,
    },
  });

  return { success: true };
}
