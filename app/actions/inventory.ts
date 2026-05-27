"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/authorization";
import { isDatabaseConfigured } from "@/lib/env";
import { inventorySaveSchema } from "@/lib/validations/inventory";

import { withAction } from "@/lib/actions/withAction";
import { saveInventoryFacts as saveInventoryFactsService } from "@/lib/inventory/inventory.service";

export type InventoryActionResult = { error?: string; success?: boolean };

export async function saveInventoryFacts(
  shiftId: string,
  items: { productName: string; fact: number }[],
): Promise<InventoryActionResult> {
  if (!isDatabaseConfigured()) {
    return { error: "База данных не настроена" };
  }

  const parsed = inventorySaveSchema.safeParse({ shiftId, items });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
  }

  const wrapped = await withAction(async () => {
    const user = await getSessionUser();
    requireUser(user);

    await saveInventoryFactsService(user, parsed.data.shiftId, parsed.data.items);

    revalidatePath("/inventory");
    return { success: true };
  });

  if (wrapped.error) return { error: wrapped.error };
  return wrapped.data!;
}
