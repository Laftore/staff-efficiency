import { prisma } from "@/lib/prisma";
import {
  fetchSmartshellProducts,
  normalizeSmartshellProduct,
  syncSmartshellInventoryForShift as syncSmartshellInventoryForShiftRaw,
  syncSmartshellSalesForShift as syncSmartshellSalesForShiftRaw,
  syncSmartshellShifts as syncSmartshellShiftsRaw,
} from "./service";
import type { SmartshellSyncStatus } from "./types";

export { fetchSmartshellProducts, normalizeSmartshellProduct };

function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  const message = String(error instanceof Error ? error.message : error ?? "");
  return /network|timeout|timed out|ECONNRESET|EAI_AGAIN|503|504|502|rate limit|temporar/i.test(
    message,
  );
}

async function retryAsync<T>(
  operation: () => Promise<T>,
  attempts = 2,
  delayMs = 250,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryableError(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}

export async function syncSmartshellBranchData(
  branchId: string,
  from: string | Date,
  to: string | Date,
): Promise<SmartshellSyncStatus> {
  const fromIso = typeof from === "string" ? from : from.toISOString();
  const toIso = typeof to === "string" ? to : to.toISOString();

  console.log("[Smartshell] Starting branch sync", {
    branchId,
    from: fromIso,
    to: toIso,
  });

  const status: SmartshellSyncStatus = {
    operation: "branchSync",
    branchId,
    success: false,
    count: 0,
    errors: [],
  };

  try {
    const result = await retryAsync(() => syncSmartshellShiftsRaw(branchId, fromIso, toIso), 2);
    status.count = result.count;

    console.log("[Smartshell] Shifts synced", {
      branchId,
      shiftsCount: result.count,
    });

    const importedShifts = await prisma.shift.findMany({
      where: {
        branchId,
        date: {
          gte: new Date(fromIso),
          lte: new Date(toIso),
        },
      },
      select: { id: true },
    });

    console.log("[Smartshell] Starting inventory sync for shifts", {
      branchId,
      shiftsToSync: importedShifts.length,
    });

    const inventoryResults = await Promise.all(
      importedShifts.map((shift) => syncSmartshellInventoryForShiftRaw(shift.id)),
    );

    status.salesCount = inventoryResults.reduce(
      (total, item) => total + (item.salesCount ?? 0),
      0,
    );

    status.success = true;
    status.lastSyncedAt = new Date();

    await prisma.branch.update({
      where: { id: branchId },
      data: { smartshellLastSyncAt: status.lastSyncedAt },
    });

    console.log("[Smartshell] Branch sync succeeded", {
      branchId,
      shiftsCount: status.count,
      salesCount: status.salesCount,
      lastSyncedAt: status.lastSyncedAt.toISOString(),
    });

    return status;
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error ?? "Unknown error");
    status.errors.push(message);

    console.error("[Smartshell] Branch sync failed", {
      branchId,
      error: message,
    });

    return status;
  }

  return status;
}

export async function syncSmartshellBranches(
  branchIds: string[],
  from: string | Date,
  to: string | Date,
): Promise<SmartshellSyncStatus[]> {
  if (branchIds.length === 0) {
    return [];
  }

  const statuses = await Promise.all(
    branchIds.map(async (branchId) => {
      return await syncSmartshellBranchData(branchId, from, to);
    }),
  );

  const succeeded = statuses.filter((status) => status.success).length;
  const failed = statuses.length - succeeded;
  console.info("Smartshell batch branch sync completed", {
    branches: branchIds.length,
    succeeded,
    failed,
  });

  return statuses;
}

export async function syncSmartshellSalesForShift(
  shiftId: string,
): Promise<SmartshellSyncStatus> {
  const status: SmartshellSyncStatus = {
    operation: "salesSync",
    shiftId,
    success: false,
    count: 0,
    salesCount: 0,
    errors: [],
  };

  try {
    const result = await retryAsync(() => syncSmartshellSalesForShiftRaw(shiftId), 2);
    status.count = result.count;
    status.salesCount = result.count;
    status.success = true;
    status.lastSyncedAt = new Date();

    console.info("Smartshell sales sync succeeded", {
      shiftId,
      salesCount: status.salesCount,
      lastSyncedAt: status.lastSyncedAt.toISOString(),
    });
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error ?? "Unknown error");
    status.errors.push(message);
    console.error("Smartshell sales sync failed", {
      shiftId,
      error: message,
    });
  }

  return status;
}

export async function syncSmartshellShiftInventory(
  shiftId: string,
): Promise<SmartshellSyncStatus> {
  const status: SmartshellSyncStatus = {
    operation: "inventorySync",
    shiftId,
    success: false,
    count: 0,
    errors: [],
  };

  try {
    const result = await retryAsync(() => syncSmartshellInventoryForShiftRaw(shiftId), 2);
    status.count = result.count;
    status.salesCount = result.salesCount ?? 0;
    status.success = true;
    status.lastSyncedAt = new Date();

    console.info("Smartshell inventory sync succeeded", {
      shiftId,
      count: status.count,
      salesCount: status.salesCount,
      lastSyncedAt: status.lastSyncedAt.toISOString(),
    });
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error ?? "Unknown error");
    status.errors.push(message);
    console.error("Smartshell inventory sync failed", {
      shiftId,
      error: message,
    });
  }

  return status;
}
