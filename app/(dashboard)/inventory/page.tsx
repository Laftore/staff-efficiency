import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { InventoryWorkspace } from "@/components/inventory/inventory-workspace";
import { SmartshellSyncStatus } from "@/components/dashboard/smartshell-sync-status";
import { getSessionUser } from "@/lib/auth/session";
import { isDatabaseConfigured, isSmartshellConfigured } from "@/lib/env";
import { listBranchesForUser } from "@/lib/shifts/queries";
import {
  getInventoryRowsForShift,
  listShiftsForInventory,
} from "@/lib/inventory/queries";

interface InventoryPageProps {
  searchParams: Promise<{ shiftId?: string }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const user = await getSessionUser();

  const branches = await listBranchesForUser(user);
  const branchIds = branches.map((b) => b.id);

  const lastSyncedAt = branches
    .map((branch) => branch.smartshellLastSyncAt)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() ?? null;

  const shifts = await listShiftsForInventory(user);
  const activeShiftId =
    params.shiftId && shifts.some((s) => s.id === params.shiftId)
      ? params.shiftId
      : shifts[0]?.id;

  const rows = activeShiftId ? await getInventoryRowsForShift(activeShiftId) : [];

  return (
    <>
      <DashboardHeader title="Инвентаризация магазина" showSignOut={Boolean(user)} />
      <div className="space-y-6 p-6">
        <SmartshellSyncStatus branchIds={branchIds} latestSmartshellSyncAt={lastSyncedAt} />

        {!isSmartshellConfigured() ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Smartshell API не настроен. Временно используется локальный каталог placeholder.
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Каталог товаров загружается из Smartshell. Вводите только «факт»; остальные колонки
            пересчитываются автоматически.
          </p>
        )}

        {!isDatabaseConfigured() ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Подключите DATABASE_URL для сохранения инвентаризации по сменам.
          </div>
        ) : null}

        <InventoryWorkspace
          shifts={shifts.map((s) => ({ id: s.id, label: s.label }))}
          activeShiftId={activeShiftId}
          rows={rows}
        />
      </div>
    </>
  );
}
