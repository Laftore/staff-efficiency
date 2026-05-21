import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ShiftFormDialog } from "@/components/shifts/shift-form-dialog";
import { ShiftsFilters } from "@/components/shifts/shifts-filters";
import { ShiftsTable, type ShiftRow } from "@/components/shifts/shifts-table";
import { SmartshellSyncStatus } from "@/components/dashboard/smartshell-sync-status";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAllBranches, canResetBonus } from "@/lib/auth/roles";
import { isDatabaseConfigured, isSmartshellConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  listBranchesForUser,
  listShifts,
  type ShiftFilters,
} from "@/lib/shifts/queries";
import type { ShiftType } from "@/types";

interface ShiftsPageProps {
  searchParams: Promise<{
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default async function ShiftsPage({ searchParams }: ShiftsPageProps) {
  const params = await searchParams;
  const user = await getSessionUser();

  const filters: ShiftFilters = {
    branchId: params.branchId,
    dateFrom: params.dateFrom ?? defaultDateFrom(),
    dateTo: params.dateTo,
  };

  const branches = await listBranchesForUser(user);
  const branchIds = branches.map((b) => b.id);

  const lastSyncedAt = branches
    .map((branch) => branch.smartshellLastSyncAt)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString() ?? null;

  const shiftsRaw = await listShifts(user, filters);
  let employees = isDatabaseConfigured()
    ? await prisma.employee.findMany({
        where: { branchId: { in: branchIds.length > 0 ? branchIds : ["__none__"] } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, branchId: true, profileId: true },
      })
    : [];

  if (user?.role === "ADMIN") {
    employees = employees.filter((e) => e.profileId === user.id);
  }

  const employeesByBranch = employees.reduce<Record<string, { id: string; name: string }[]>>(
    (acc, e) => {
      if (!acc[e.branchId]) acc[e.branchId] = [];
      acc[e.branchId].push({ id: e.id, name: e.name });
      return acc;
    },
    {},
  );

  const shifts: ShiftRow[] = shiftsRaw.map((s) => ({
    id: s.id,
    branchId: s.branchId,
    branchName: s.branch.name,
    employeeId: s.employeeId,
    employeeName: s.employee.name,
    date: s.date.toISOString(),
    type: s.type as ShiftType,
    revenueTariff: s.revenueTariff,
    revenueGoods: s.revenueGoods,
    bonusAdjustment: s.bonusAdjustment,
    bonus: s.bonus,
    bonusManualReset: s.bonusManualReset,
  }));

  const defaultBranchId =
    params.branchId ?? user?.branchId ?? branches[0]?.id;
  const showBranchFilter = !user || canAccessAllBranches(user.role);
  const canReset = user ? canResetBonus(user.role) : false;
  const canEdit = Boolean(user);
  const canCreate = canEdit && Object.values(employeesByBranch).some((list) => list.length > 0);

  return (
    <>
      <DashboardHeader title="Смены" showSignOut={Boolean(user)} />
      <div className="space-y-6 p-6">
        {!isSmartshellConfigured() ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Smartshell API не настроен. Данные смен загружаются из локальной базы данных.
          </div>
        ) : null}

        <SmartshellSyncStatus branchIds={branchIds} latestSmartshellSyncAt={lastSyncedAt} />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {shifts.length} смен в выборке · бонус считается по формулам O, P, Q (0–1 500 ₽)
            </p>
          </div>
          {canCreate && user ? (
            <ShiftFormDialog
              branches={branches}
              employeesByBranch={employeesByBranch}
              defaultBranchId={defaultBranchId}
              userRole={user.role}
            />
          ) : null}
        </div>

        {!isDatabaseConfigured() ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Подключите DATABASE_URL в .env.local и выполните{" "}
            <code className="text-xs">npx prisma migrate deploy && npm run db:seed</code>
          </div>
        ) : null}

        <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted/30" />}>
          <ShiftsFilters
            branches={branches}
            showBranchFilter={showBranchFilter}
            initialBranchId={params.branchId ?? "all"}
            initialDateFrom={filters.dateFrom}
            initialDateTo={filters.dateTo}
          />
        </Suspense>

        <ShiftsTable
          shifts={shifts}
          canResetBonus={canReset}
          canEdit={canEdit}
          branches={branches}
          employeesByBranch={employeesByBranch}
          defaultBranchId={defaultBranchId}
          userRole={user?.role ?? "ADMIN"}
        />
      </div>
    </>
  );
}
