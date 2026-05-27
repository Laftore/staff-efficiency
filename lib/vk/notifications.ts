import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/types";
import { VKClient } from "./client";
import type { VKMessage } from "./types";
import { isFeatureEnabled } from "@/lib/feature-flags/feature-flags.service";

/**
 * Результат отправки уведомления.
 */
export type NotificationResult = {
  success: boolean;
  sentCount?: number;
  error?: string;
  skipped?: boolean; // true if the notification was skipped due to feature flag
};

/**
 * Получить список получателей уведомлений с учётом multi-tenant и ролей.
 *
 * Правила (MVP):
 * - OWNER всегда получает уведомления (по всем филиалам), если у него заполнен vkChatId.
 * - SENIOR_ADMIN получает уведомления только по тем филиалам, где он работает (Profile.branchId).
 * - Обычные ADMIN уведомления НЕ получают.
 */
export async function getVkRecipients(branchId?: string) {
  const where: any = {
    vkChatId: { not: null },
    role: { in: ["OWNER", "SENIOR_ADMIN"] as AppRole[] },
  };

  if (branchId) {
    where.OR = [
      { role: "OWNER" }, // OWNER видит все филиалы
      {
        role: "SENIOR_ADMIN",
        branchId: branchId,
      },
    ];
  } else {
    // Если branchId не указан — только OWNER (редкий случай)
    where.role = "OWNER";
  }

  const profiles = await prisma.profile.findMany({
    where,
    select: {
      id: true,
      displayName: true,
      role: true,
      vkChatId: true,
      branchId: true,
    },
  });

  return profiles
    .filter((p) => p.vkChatId !== null)
    .map((p) => ({
      profileId: p.id,
      vkChatId: p.vkChatId!, // гарантировано не null после фильтра
      role: p.role as AppRole,
      displayName: p.displayName,
      branchId: p.branchId,
    }));
}

/* ===================== УВЕДОМЛЕНИЯ ===================== */

/**
 * Уведомление о создании новой смены.
 *
 * Пример сообщения:
 * 📋 Новая смена создана!
 *
 * Филиал: Центральный
 * Сотрудник: Иван Петров
 * Дата: 27.05.2026
 * Тип: День (план 15 000 ₽)
 * Выручка: 18 450 ₽
 */
export async function notifyNewShiftCreated(shiftId: string): Promise<NotificationResult> {
  console.log("[VK Bot] Sending notification", {
    type: "new_shift_created",
    shiftId,
  });

  const notificationsEnabled = await isFeatureEnabled("VK_NOTIFICATIONS_ENABLED");

  if (!notificationsEnabled) {
    console.log("[VK Bot] Notification skipped - VK notifications are disabled by feature flag", {
      type: "new_shift_created",
      shiftId,
    });
    return { success: true, sentCount: 0, skipped: true };
  }

  try {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        branch: { select: { name: true } },
        employee: { select: { name: true } },
      },
    });

    if (!shift) {
      console.warn("[VK Bot] Notification skipped - shift not found", { shiftId, type: "new_shift_created" });
      return { success: false, error: "Shift not found" };
    }

    const recipients = await getVkRecipients(shift.branchId);

    console.log("[VK Bot] Recipients resolved", {
      type: "new_shift_created",
      shiftId,
      branchId: shift.branchId,
      recipientsCount: recipients.length,
    });

    if (recipients.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const messageText = [
      "📋 Новая смена создана!",
      "",
      `Филиал: ${shift.branch.name}`,
      `Сотрудник: ${shift.employee.name}`,
      `Дата: ${shift.date.toLocaleDateString("ru-RU")}`,
      `Тип: ${formatShiftType(shift.type)}`,
      `Выручка: ${(shift.revenueTariff + shift.revenueGoods).toLocaleString("ru-RU")} ₽`,
    ].join("\n");

    let sentCount = 0;

    for (const recipient of recipients) {
      const message: VKMessage = {
        peer_id: Number(recipient.vkChatId),
        message: messageText,
      };

      const result = await VKClient.sendMessage(message);
      if (result) sentCount++;
    }

    console.log("[VK Bot] Notification sent", {
      type: "new_shift_created",
      shiftId,
      branchId: shift.branchId,
      sentCount,
      totalRecipients: recipients.length,
    });

    return { success: true, sentCount };
  } catch (error) {
    console.error("[VK Bot] Notification failed", {
      type: "new_shift_created",
      shiftId,
      error: String(error),
    });
    return { success: false, error: String(error) };
  }
}

/**
 * Уведомление о том, что бонус требует обнуления (needsReset = true).
 *
 * Пример сообщения:
 * ⚠️ Бонус требует обнуления!
 *
 * Филиал: Центральный
 * Сотрудник: Иван Петров
 * Дата: 27.05.2026
 * Бонус: -120 ₽ (Q < 0)
 *
 * Рекомендуется обнулить бонус вручную.
 */
export async function notifyBonusNeedsReset(shiftId: string): Promise<NotificationResult> {
  console.log("[VK Bot] Sending notification", {
    type: "bonus_needs_reset",
    shiftId,
  });

  const notificationsEnabled = await isFeatureEnabled("VK_NOTIFICATIONS_ENABLED");

  if (!notificationsEnabled) {
    console.log("[VK Bot] Notification skipped - VK notifications are disabled by feature flag", {
      type: "bonus_needs_reset",
      shiftId,
    });
    return { success: true, sentCount: 0, skipped: true };
  }

  try {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        branch: { select: { name: true } },
        employee: { select: { name: true } },
      },
    });

    if (!shift) {
      console.warn("[VK Bot] Notification skipped - shift not found", { shiftId, type: "bonus_needs_reset" });
      return { success: false, error: "Shift not found" };
    }

    const recipients = await getVkRecipients(shift.branchId);

    console.log("[VK Bot] Recipients resolved", {
      type: "bonus_needs_reset",
      shiftId,
      branchId: shift.branchId,
      recipientsCount: recipients.length,
    });

    if (recipients.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const totalRevenue = shift.revenueTariff + shift.revenueGoods;
    const messageText = [
      "⚠️ Бонус требует обнуления!",
      "",
      `Филиал: ${shift.branch.name}`,
      `Сотрудник: ${shift.employee.name}`,
      `Дата: ${shift.date.toLocaleDateString("ru-RU")}`,
      `Выручка: ${totalRevenue.toLocaleString("ru-RU")} ₽`,
      `Текущий бонус: ${shift.bonus} ₽`,
      "",
      "Q < 0 — рекомендуется обнулить бонус вручную.",
    ].join("\n");

    let sentCount = 0;

    for (const recipient of recipients) {
      const message: VKMessage = {
        peer_id: Number(recipient.vkChatId),
        message: messageText,
      };

      const result = await VKClient.sendMessage(message);
      if (result) sentCount++;
    }

    console.log("[VK Bot] Notification sent", {
      type: "bonus_needs_reset",
      shiftId,
      branchId: shift.branchId,
      sentCount,
      totalRecipients: recipients.length,
    });

    return { success: true, sentCount };
  } catch (error) {
    console.error("[VK Bot] Notification failed", {
      type: "bonus_needs_reset",
      shiftId,
      error: String(error),
    });
    return { success: false, error: String(error) };
  }
}

/**
 * Уведомление об обнулении бонуса.
 *
 * Пример сообщения:
 * 🔄 Бонус обнулён
 *
 * Филиал: Центральный
 * Сотрудник: Иван Петров
 * Дата: 27.05.2026
 * Бонус установлен в 0 ₽
 */
export async function notifyBonusWasReset(shiftId: string): Promise<NotificationResult> {
  console.log("[VK Bot] Sending notification", {
    type: "bonus_was_reset",
    shiftId,
  });

  const notificationsEnabled = await isFeatureEnabled("VK_NOTIFICATIONS_ENABLED");

  if (!notificationsEnabled) {
    console.log("[VK Bot] Notification skipped - VK notifications are disabled by feature flag", {
      type: "bonus_was_reset",
      shiftId,
    });
    return { success: true, sentCount: 0, skipped: true };
  }

  try {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        branch: { select: { name: true } },
        employee: { select: { name: true } },
      },
    });

    if (!shift) {
      console.warn("[VK Bot] Notification skipped - shift not found", { shiftId, type: "bonus_was_reset" });
      return { success: false, error: "Shift not found" };
    }

    const recipients = await getVkRecipients(shift.branchId);

    console.log("[VK Bot] Recipients resolved", {
      type: "bonus_was_reset",
      shiftId,
      branchId: shift.branchId,
      recipientsCount: recipients.length,
    });

    if (recipients.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const messageText = [
      "🔄 Бонус обнулён",
      "",
      `Филиал: ${shift.branch.name}`,
      `Сотрудник: ${shift.employee.name}`,
      `Дата: ${shift.date.toLocaleDateString("ru-RU")}`,
      "Бонус принудительно установлен в 0 ₽",
    ].join("\n");

    let sentCount = 0;

    for (const recipient of recipients) {
      const message: VKMessage = {
        peer_id: Number(recipient.vkChatId),
        message: messageText,
      };

      const result = await VKClient.sendMessage(message);
      if (result) sentCount++;
    }

    console.log("[VK Bot] Notification sent", {
      type: "bonus_was_reset",
      shiftId,
      branchId: shift.branchId,
      sentCount,
      totalRecipients: recipients.length,
    });

    return { success: true, sentCount };
  } catch (error) {
    console.error("[VK Bot] Notification failed", {
      type: "bonus_was_reset",
      shiftId,
      error: String(error),
    });
    return { success: false, error: String(error) };
  }
}

/* ===================== Вспомогательные функции ===================== */

function formatShiftType(type: string): string {
  switch (type) {
    case "DAY":
      return "День (план 15 000 ₽)";
    case "NIGHT":
      return "Ночь (план 5 000 ₽)";
    case "EXTRA":
      return "Доп (план 5 000 ₽)";
    default:
      return type;
  }
}
