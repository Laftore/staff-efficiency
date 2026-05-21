import { isSmartshellConfigured } from "@/lib/env";
import { smartshell } from "./client";
import { PRODUCTS_QUERY, SHIFTS_QUERY, WORK_SHIFT_ITEMS_QUERY } from "./queries";
import { calculateShiftBonus, getStoredBonusValue } from "@/lib/kpi/bonus";
import { prisma } from "@/lib/prisma";
import type { ShiftType } from "@/types";
import type {
  SmartshellProduct,
  SmartshellSalesItem,
  SmartshellShift,
  SmartshellSyncResult,
} from "./types";

const DEFAULT_LOOKBACK_DAYS = 30;

interface ShiftFilters {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchSmartshellShifts(
  branchId: string,
  from: string,
  to: string,
): Promise<SmartshellShift[]> {
  if (!isSmartshellConfigured()) {
    return [];
  }

  const result = await smartshell.query<{ shifts: SmartshellShift[] }>(SHIFTS_QUERY, {
    branchId,
    from,
    to,
  });

  return result.shifts ?? [];
}

export async function fetchSmartshellProducts(branchId: string): Promise<SmartshellProduct[]> {
  if (!isSmartshellConfigured()) {
    return [];
  }

  const result = await smartshell.query<{ products: SmartshellProduct[] }>(PRODUCTS_QUERY, {
    branchId,
  });

  return result.products ?? [];
}

export async function fetchSmartshellSalesForShift(shiftId: string): Promise<SmartshellSalesItem[]> {
  if (!isSmartshellConfigured()) {
    return [];
  }

  const result = await smartshell.query<{ workShiftItems: SmartshellSalesItem[] }>(WORK_SHIFT_ITEMS_QUERY, {
    workShiftId: shiftId,
  });

  return result.workShiftItems ?? [];
}

export function normalizeSmartshellProduct(product: SmartshellProduct) {
  return {
    productName: product.name,
    sku: product.sku ?? "",
    category: product.category ?? "Товар",
    previousStock: Number(product.previousStock ?? 0),
    delivered: Number(product.delivered ?? 0),
    displayed: Number(product.displayed ?? 0),
  };
}

export function normalizeSmartshellSalesItem(item: SmartshellSalesItem) {
  return {
    productName: item.name,
    sku: item.sku ?? "",
    category: item.category ?? "Товар",
    sold: Number(item.sold ?? 0),
    revenueGoods: Number(item.revenueGoods ?? 0),
  };
}

function toShiftType(value: string | undefined): ShiftType {
  if (value === "NIGHT" || value === "EXTRA") {
    return value;
  }
  return "DAY";
}

async function findOrCreateShiftEmployee(branchId: string, name: string) {
  const normalizedName = name.trim() || "Неизвестный сотрудник";

  let employee = await prisma.employee.findFirst({
    where: {
      branchId,
      name: normalizedName,
    },
  });

  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        branchId,
        name: normalizedName,
      },
    });
  }

  return employee;
}

function parseFilterDate(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

export async function syncSmartshellShifts(
  branchId: string,
  from: string,
  to: string,
): Promise<SmartshellSyncResult> {
  if (!isSmartshellConfigured()) {
    return { count: 0 };
  }

  const externalShifts = await fetchSmartshellShifts(branchId, from, to);
  if (externalShifts.length === 0) {
    return { count: 0 };
  }

  await Promise.all(
    externalShifts.map(async (external) => {
      const type = toShiftType(external.type);
      const employeeName = external.employee?.name ?? "Неизвестный сотрудник";
      const employee = await findOrCreateShiftEmployee(branchId, employeeName);
      const revenueTariff = Number(external.revenueTariff ?? 0);
      const revenueGoods = Number(external.revenueGoods ?? 0);
      const bonus = getStoredBonusValue(
        calculateShiftBonus({
          shiftType: type,
          revenueTariff,
          revenueGoods,
          bonusAdjustment: 0,
          bonusManualReset: false,
        }),
      );

      const dbShift = {
        branchId,
        employeeId: employee.id,
        date: new Date(external.openedAt),
        type,
        revenueTariff,
        revenueGoods,
        bonusAdjustment: 0,
        bonus,
        bonusManualReset: false,
      };

      await prisma.shift.upsert({
        where: { id: external.id },
        create: {
          id: external.id,
          ...dbShift,
        },
        update: dbShift,
      });
    }),
  );

  return { count: externalShifts.length };
}

export async function syncSmartshellSalesForShift(
  shiftId: string,
): Promise<SmartshellSyncResult> {
  if (!isSmartshellConfigured()) {
    return { count: 0 };
  }

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { branchId: true },
  });

  if (!shift?.branchId) {
    return { count: 0 };
  }

  const salesItems = await fetchSmartshellSalesForShift(shiftId);
  if (salesItems.length === 0) {
    return { count: 0 };
  }

  const normalizedSales = salesItems.map(normalizeSmartshellSalesItem);
  const existingItems = await prisma.inventoryItem.findMany({
    where: { shiftId },
  });
  const existingByName = new Map(existingItems.map((item) => [item.productName, item]));

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      normalizedSales.map(async (item) => {
        const existing = existingByName.get(item.productName);
        if (existing) {
          await tx.inventoryItem.update({
            where: { id: existing.id },
            data: {
              sku: item.sku,
              category: item.category,
              sold: item.sold,
              revenueGoods: item.revenueGoods,
            },
          });
          return;
        }

        await tx.inventoryItem.create({
          data: {
            shiftId,
            productName: item.productName,
            sku: item.sku,
            category: item.category,
            previousStock: 0,
            delivered: 0,
            displayed: 0,
            sold: item.sold,
            revenueGoods: item.revenueGoods,
            fact: 0,
          },
        });
      }),
    );
  });

  return { count: normalizedSales.length };
}

export async function syncSmartshellInventoryForShift(
  shiftId: string,
): Promise<SmartshellSyncResult> {
  if (!isSmartshellConfigured()) {
    return { count: 0 };
  }

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { branchId: true },
  });

  if (!shift?.branchId) {
    return { count: 0 };
  }

  const externalProducts = await fetchSmartshellProducts(shift.branchId);
  const normalizedProducts = externalProducts.map(normalizeSmartshellProduct);
  const existingItems = await prisma.inventoryItem.findMany({
    where: { shiftId },
  });
  const existingByName = new Map(existingItems.map((item) => [item.productName, item]));

  if (normalizedProducts.length > 0) {
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        normalizedProducts.map(async (product) => {
          const existing = existingByName.get(product.productName);
          if (existing) {
            await tx.inventoryItem.update({
              where: { id: existing.id },
              data: {
                sku: product.sku,
                category: product.category,
                previousStock: product.previousStock,
                delivered: product.delivered,
                displayed: product.displayed,
              },
            });
            return;
          }

          await tx.inventoryItem.create({
            data: {
              shiftId,
              productName: product.productName,
              sku: product.sku,
              category: product.category,
              previousStock: product.previousStock,
              delivered: product.delivered,
              displayed: product.displayed,
              fact: Math.max(0, product.previousStock + product.delivered - product.displayed),
            },
          });
        }),
      );
    });
  }

  const salesResult = await syncSmartshellSalesForShift(shiftId);
  return { count: normalizedProducts.length, salesCount: salesResult.count };
}

export async function enrichShiftRowsWithSmartshell<ShiftRow extends { id: string; branchId: string; date: Date; employee?: { name: string | null }; revenueTariff: number; revenueGoods: number; }>(
  shifts: ShiftRow[],
  branchIds: string[],
  filters: ShiftFilters,
): Promise<ShiftRow[]> {
  if (!isSmartshellConfigured() || branchIds.length === 0) {
    return shifts;
  }

  const from = parseFilterDate(filters.dateFrom, false) ?? new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const to = parseFilterDate(filters.dateTo, true) ?? new Date();

  const externalShiftSets = await Promise.all(
    branchIds.map(async (branchId) => {
      try {
        return await fetchSmartshellShifts(branchId, from.toISOString(), to.toISOString());
      } catch (error) {
        console.error("Smartshell shift import failed for branch", branchId, error);
        return [] as SmartshellShift[];
      }
    }),
  );

  const externalShifts = externalShiftSets.flat();
  if (externalShifts.length === 0) {
    return shifts;
  }

  const externalById = new Map(externalShifts.map((s) => [s.id, s]));

  return shifts.map((shift) => {
    const externalShift = externalById.get(shift.id) ?? externalShifts.find((candidate) => {
      const candidateDate = new Date(candidate.openedAt).toISOString().slice(0, 10);
      const shiftDate = shift.date.toISOString().slice(0, 10);

      if (candidate.branch?.id !== shift.branchId) {
        return false;
      }

      if (candidateDate !== shiftDate) {
        return false;
      }

      const employeeName = shift.employee?.name?.trim() ?? "";
      const candidateEmployee = candidate.employee?.name?.trim() ?? "";
      return employeeName.length > 0 && candidateEmployee.length > 0 && employeeName === candidateEmployee;
    });

    if (!externalShift) {
      return shift;
    }

    return {
      ...shift,
      revenueTariff: externalShift.revenueTariff,
      revenueGoods: externalShift.revenueGoods,
    };
  });
}
