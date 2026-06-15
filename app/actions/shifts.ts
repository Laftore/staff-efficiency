"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/authorization";
import { isDatabaseConfigured } from "@/lib/env";
import { shiftFormSchema, updateShiftSchema } from "@/lib/validations/shift";

import { withAction } from "@/lib/actions/withAction";
import {
  createShift,
  updateShift,
  resetShiftBonus as resetBonusService,
} from "@/lib/shifts/shift.service";

// VK Bot уведомления (fire-and-forget)
import {
  notifyNewShiftCreated,
  notifyBonusNeedsReset,
  notifyBonusWasReset,
} from "@/lib/vk/notifications";



export type ShiftActionResult = {
  error?: string;
  success?: boolean;
  requiresConfirmation?: boolean;
};

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

export async function saveShift(
  _prev: ShiftActionResult | null,
  formData: FormData,
): Promise<ShiftActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  const raw = formDataToObject(formData);
  const isUpdate = Boolean(raw.id && String(raw.id).length > 0);

  if (isUpdate) {
    const parsed = updateShiftSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
    }

    const wrapped = await withAction(async () => {
      const user = await getSessionUser();
      requireUser(user);

      await updateShift(user, {
        id: parsed.data.id!,
        branchId: parsed.data.branchId,
        employeeId: parsed.data.employeeId,
        date: parsed.data.date,
        type: parsed.data.type,
        revenueTariff: parsed.data.revenueTariff,
        revenueGoods: parsed.data.revenueGoods,
        bonusAdjustment: parsed.data.bonusAdjustment,
      });

      revalidatePath("/shifts");
      revalidatePath("/");
      return { success: true as const };
    });

    if (wrapped.error) return { error: wrapped.error };
    return wrapped.data!;
  }

  // Создание новой смены
  const parsed = shiftFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
  }

  const wrapped = await withAction(async () => {
    const user = await getSessionUser();
    requireUser(user);

    const result = await createShift(user, {
      branchId: parsed.data.branchId,
      employeeId: parsed.data.employeeId,
      date: parsed.data.date,
      type: parsed.data.type,
      revenueTariff: parsed.data.revenueTariff,
      revenueGoods: parsed.data.revenueGoods,
      bonusAdjustment: parsed.data.bonusAdjustment,
    });

    // VK уведомления (fire-and-forget)
    // Проверка флага VK_NOTIFICATIONS_ENABLED происходит внутри notify* функций
    notifyNewShiftCreated(result.shiftId).catch((err) =>
      console.error("[VK] notifyNewShiftCreated failed:", err)
    );

    if (result.needsReset) {
      notifyBonusNeedsReset(result.shiftId).catch((err) =>
        console.error("[VK] notifyBonusNeedsReset failed:", err)
      );
    }

    return { success: true };
  });

  if (wrapped.error) return { error: wrapped.error };
  return wrapped.data!;
}

export async function resetShiftBonus(shiftId: string): Promise<ShiftActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  const wrapped = await withAction(async () => {
    const user = await getSessionUser();
    requireUser(user);

    const result = await resetBonusService(user, shiftId);

    // Если флаг BONUS_RESET_CONFIRMATION включён — сервис вернул сигнал,
    // что нужен дополнительный шаг подтверждения. Сброс не выполнен.
    // Уведомление и revalidate НЕ вызываем (сброса ещё не было).
    if ("requiresConfirmation" in result && result.requiresConfirmation) {
      return { requiresConfirmation: true };
    }

    // Обычный путь: сброс выполнен
    // VK уведомление (fire-and-forget)
    // Проверка флага VK_NOTIFICATIONS_ENABLED происходит внутри notify* функций
    notifyBonusWasReset(shiftId).catch((err) =>
      console.error("[VK] notifyBonusWasReset failed:", err)
    );

    revalidatePath("/shifts");
    return { success: true };
  });

  if (wrapped.error) return { error: wrapped.error };
  return wrapped.data!;
}
