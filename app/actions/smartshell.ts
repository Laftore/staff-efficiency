"use server";

import { revalidatePath } from "next/cache";
import { syncSmartshellBranches } from "@/lib/smartshell/import-service";
import type { SmartshellSyncStatus } from "@/lib/smartshell/types";

export async function syncSmartshellBranchesAction(
  branchIds: string[],
): Promise<SmartshellSyncStatus[]> {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const to = new Date();

  const statuses = await syncSmartshellBranches(branchIds, from, to);
  revalidatePath("/shifts");
  revalidatePath("/inventory");

  return statuses;
}
