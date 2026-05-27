"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/env";

export type VkActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Позволяет OWNER обновить свой vkChatId для получения VK Bot уведомлений.
 * Доступно только пользователям с ролью OWNER.
 */
export async function updateOwnVkChatId(
  vkChatId: string | null
): Promise<VkActionResult> {
  if (!isDatabaseConfigured()) {
    return { success: false, error: "База данных не настроена" };
  }

  try {
    const user = await getSessionUser();
    requireUser(user);

    if (user.role !== "OWNER") {
      return { success: false, error: "Только владелец может настраивать VK Bot" };
    }

    let chatId: bigint | null = null;

    if (vkChatId && vkChatId.trim() !== "") {
      try {
        chatId = BigInt(vkChatId.trim());
      } catch {
        return { success: false, error: "Некорректный VK Chat ID (должно быть число)" };
      }
    }

    await prisma.profile.update({
      where: { id: user.id },
      data: { vkChatId: chatId },
    });

    revalidatePath("/branches");
    return { success: true };
  } catch (e) {
    console.error("[VK] updateOwnVkChatId error:", e);
    return { success: false, error: "Не удалось сохранить VK Chat ID" };
  }
}
