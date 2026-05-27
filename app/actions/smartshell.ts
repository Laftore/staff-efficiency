"use server";

import { revalidatePath } from "next/cache";
import { syncSmartshellBranches } from "@/lib/smartshell/import-service";
import type { SmartshellSyncStatus } from "@/lib/smartshell/types";

/**
 * Server Action для ручной синхронизации данных из Smartshell.
 * Возвращает детальный статус по каждому филиалу.
 * Ошибки отдельных филиалов не прерывают всю операцию (graceful degradation).
 */
export async function syncSmartshellBranchesAction(
  branchIds: string[],
): Promise<SmartshellSyncStatus[]> {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const to = new Date();

  try {
    const statuses = await syncSmartshellBranches(branchIds, from, to);

    revalidatePath("/shifts");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");

    return statuses;
  } catch (error) {
    console.error("[smartshell] Sync failed:", error);

    // Возвращаем массив с ошибками для всех запрошенных филиалов,
    // чтобы UI мог красиво показать статус (toast уже обрабатывает failed > 0)
    return branchIds.map((branchId) => ({
      operation: "branchSync" as const,
      branchId,
      success: false,
      count: 0,
      salesCount: 0,
      errors: ["Не удалось выполнить синхронизацию. Проверьте токен Smartshell и подключение."],
      lastSyncedAt: undefined,
    }));
  }
}
