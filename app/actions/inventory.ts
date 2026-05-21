"use server";

import { revalidatePath } from "next/cache";
import {
  AuthorizationError,
  requireUser,
} from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/auth/session";
import { SMARTSHELL_PLACEHOLDER_CATALOG } from "@/lib/inventory/catalog";
import { assertShiftInventoryAccess } from "@/lib/inventory/queries";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/env";
import { inventorySaveSchema } from "@/lib/validations/inventory";

export type InventoryActionResult = { error?: string; success?: boolean };

export async function saveInventoryFacts(
  shiftId: string,
  items: { productName: string; fact: number }[],
): Promise<InventoryActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  try {
    const user = await getSessionUser();
    requireUser(user);

    const parsed = inventorySaveSchema.safeParse({ shiftId, items });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
    }

    await assertShiftInventoryAccess(user, parsed.data.shiftId);

    const catalogMap = new Map(
      SMARTSHELL_PLACEHOLDER_CATALOG.map((c) => [c.productName, c]),
    );

    await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.deleteMany({
        where: { shiftId: parsed.data.shiftId },
      });

      const toCreate = parsed.data.items
        .filter((item) => catalogMap.has(item.productName))
        .map((item) => {
          const cat = catalogMap.get(item.productName)!;
          return {
            shiftId: parsed.data.shiftId,
            productName: item.productName,
            previousStock: cat.previousStock,
            delivered: cat.delivered,
            displayed: cat.displayed,
            fact: item.fact,
          };
        });

      if (toCreate.length > 0) {
        await tx.inventoryItem.createMany({ data: toCreate });
      }
    });

    revalidatePath("/inventory");
    return { success: true };
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return { error: e.message };
    }
    console.error(e);
    return { error: "Не удалось сохранить инвентаризацию" };
  }
}
