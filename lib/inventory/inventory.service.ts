import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/authorization";
import type { SessionUser } from "@/types";
import { assertShiftInventoryAccess } from "@/lib/inventory/queries";
import {
  SMARTSHELL_PLACEHOLDER_CATALOG,
} from "@/lib/inventory/catalog";
import { buildInventoryPersistData } from "@/lib/inventory/persist";
import {
  normalizeSmartshellProduct,
  fetchSmartshellProducts,
} from "@/lib/smartshell/service";
import { logAction, AuditAction } from "@/lib/audit/audit.service";

// ENHANCED_INVENTORY_UI — зарезервированный флаг (см. docs/feature-flags.md).
// Когда будет включён (globally или per-branch), здесь и в компонентах инвентаризации
// можно будет добавлять прогрессивные улучшения UI (расширенные таблицы, графики,
// аналитика по категориям и т.д.) без отдельного деплоя.

 /**
 * Сохраняет факты инвентаризации для смены.
 * Вся авторизация и бизнес-логика вынесена сюда.
 */
export async function saveInventoryFacts(
  user: SessionUser,
  shiftId: string,
  items: { productName: string; fact: number }[]
): Promise<{ success: true }> {
  requireUser(user);

  const { branchId } = await assertShiftInventoryAccess(user, shiftId);

  // Получаем каталог (Smartshell или заглушка)
  const externalCatalog = await fetchSmartshellProducts(branchId).catch(() => []);
  const catalogRows =
    externalCatalog.length > 0
      ? externalCatalog.map(normalizeSmartshellProduct)
      : SMARTSHELL_PLACEHOLDER_CATALOG;

  const catalogMap = new Map(catalogRows.map((c) => [c.productName, c]));

  const existingItems = await prisma.inventoryItem.findMany({
    where: { shiftId },
    select: { productName: true, sold: true, revenueGoods: true },
  });
  const existingByName = new Map(
    existingItems.map((item) => [item.productName, item]),
  );

  // Сохраняем только те позиции, которые есть в каталоге
  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.deleteMany({
      where: { shiftId },
    });

    const toCreate = items
      .filter((item) => catalogMap.has(item.productName))
      .map((item) => {
        const cat = catalogMap.get(item.productName)!;
        const existing = existingByName.get(item.productName);
        const row = buildInventoryPersistData(
          {
            productName: cat.productName,
            sku: cat.sku,
            category: cat.category,
            previousStock: cat.previousStock,
            delivered: cat.delivered,
            displayed: cat.displayed,
          },
          item.fact,
          existing,
        );

        return {
          shiftId,
          ...row,
        };
      });

    if (toCreate.length > 0) {
      await tx.inventoryItem.createMany({ data: toCreate });
    }
  });

  await logAction({
    user,
    action: AuditAction.INVENTORY_SAVED,
    entityType: "SHIFT",
    entityId: shiftId,
    branchId,
    details: {
      itemsCount: items.length,
    },
  });

  return { success: true };
}
