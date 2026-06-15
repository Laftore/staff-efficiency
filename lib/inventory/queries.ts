import { prisma } from "@/lib/prisma";
import { AuthorizationError, assertBranchAccess, branchScopeWhere } from "@/lib/auth/authorization";
import { isDatabaseConfigured } from "@/lib/env";
import { SMARTSHELL_PLACEHOLDER_CATALOG } from "@/lib/inventory/catalog";
import { fetchSmartshellProducts, normalizeSmartshellProduct, syncSmartshellShiftInventory } from "@/lib/smartshell/import-service";
import type { SessionUser } from "@/types";
import type { Prisma } from "@prisma/client";

export interface ShiftOption {
  id: string;
  label: string;
  branchId: string;
  branchName: string;
  date: string;
}

export interface InventoryRowData {
  productName: string;
  sku: string;
  category: string;
  previousStock: number;
  delivered: number;
  displayed: number;
  sold: number;
  revenueGoods: number;
  warehouse: number;
  fact: number;
}

export async function listShiftsForInventory(
  user: SessionUser | null,
): Promise<ShiftOption[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const where: Prisma.ShiftWhereInput = {};
  if (user) {
    Object.assign(where, branchScopeWhere(user));
    if (user.role === "ADMIN") {
      where.employee = { profileId: user.id };
    }
  }

  const from = new Date();
  from.setDate(from.getDate() - 14);

  const shifts = await prisma.shift.findMany({
    where: {
      ...where,
      date: { gte: from },
    },
    include: {
      employee: { select: { name: true } },
      branch: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return shifts.map((s) => ({
    id: s.id,
    branchId: s.branchId,
    branchName: s.branch.name,
    date: s.date.toISOString(),
    label: `${new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(s.date)} · ${s.branch.name} · ${s.employee.name}`,
  }));
}

export async function assertShiftInventoryAccess(
  user: SessionUser,
  shiftId: string,
): Promise<{ branchId: string }> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { branchId: true, employee: { select: { profileId: true } } },
  });

  if (!shift) {
    throw new AuthorizationError("Смена не найдена");
  }

  assertBranchAccess(user, shift.branchId);

  if (user.role === "ADMIN" && shift.employee.profileId !== user.id) {
    throw new AuthorizationError("Нет доступа к инвентаризации этой смены");
  }

  return { branchId: shift.branchId };
}

/**
 * Строки каталога + сохранённые «факт» из БД.
 */
export async function getInventoryRowsForShift(
  shiftId: string,
): Promise<InventoryRowData[]> {
  if (!isDatabaseConfigured()) {
    return SMARTSHELL_PLACEHOLDER_CATALOG.map((item) => {
      const fact = Math.max(0, item.previousStock + item.delivered - item.displayed);
      const sold = Math.max(0, item.previousStock + item.delivered - fact);
      return {
        ...item,
        fact,
        sold,
        revenueGoods: 0,
        warehouse: Math.max(0, fact - item.displayed),
      };
    });
  }

  await syncSmartshellShiftInventory(shiftId);

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { branchId: true },
  });

  const externalCatalog = shift?.branchId
    ? await fetchSmartshellProducts(shift.branchId).catch(() => [])
    : [];

  const catalog = externalCatalog.length > 0
    ? externalCatalog.map(normalizeSmartshellProduct)
    : SMARTSHELL_PLACEHOLDER_CATALOG;

  const saved = await prisma.inventoryItem.findMany({
    where: { shiftId },
  });

  const savedByName = new Map(saved.map((s) => [s.productName, s]));
  const savedBySku = new Map(
    saved.filter((s) => s.sku).map((s) => [s.sku as string, s]),
  );

  return catalog.map((item) => {
    const stored =
      savedByName.get(item.productName) ??
      (item.sku ? savedBySku.get(item.sku) : undefined);
    const defaultFact = Math.max(0, item.previousStock + item.delivered - item.displayed);
    const fact = stored?.fact ?? defaultFact;
    const sold =
      stored !== undefined
        ? stored.sold
        : Math.max(0, item.previousStock + item.delivered - fact);
    const revenueGoods =
      stored !== undefined
        ? stored.revenueGoods
        : sold * 95;
    const warehouse =
      stored !== undefined
        ? stored.warehouse
        : Math.max(0, fact - (stored?.displayed ?? item.displayed));

    return {
      productName: item.productName,
      sku: item.sku,
      category: item.category,
      previousStock: stored?.previousStock ?? item.previousStock,
      delivered: stored?.delivered ?? item.delivered,
      displayed: stored?.displayed ?? item.displayed,
      sold,
      revenueGoods,
      warehouse,
      fact,
    };
  });
}
