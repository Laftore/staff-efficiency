import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { EmployeesFilters } from "@/components/employees/employees-filters";
import { EmployeesTable, type EmployeeRow } from "@/components/employees/employees-table";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAllBranches, canManageEmployees } from "@/lib/auth/roles";
import { listEmployees, type EmployeeFilters } from "@/lib/employees/queries";
import { isDatabaseConfigured } from "@/lib/env";
import { listBranchesForUser } from "@/lib/shifts/queries";
import type { AppRole } from "@/types";

interface EmployeesPageProps {
  searchParams: Promise<{
    branchId?: string;
  }>;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams;
  const user = await getSessionUser();

  const filters: EmployeeFilters = {
    branchId: params.branchId,
  };

  const canManage = user ? canManageEmployees(user.role) : false;
  const branches = canManage ? await listBranchesForUser(user) : [];
  const employeesRaw = canManage ? await listEmployees(user, filters) : [];

  const employees: EmployeeRow[] = employeesRaw.map((e) => ({
    id: e.id,
    name: e.name,
    branchId: e.branchId,
    branchName: e.branch.name,
    profileId: e.profileId,
    profileEmail: e.profile?.email ?? null,
    profileDisplayName: e.profile?.displayName ?? null,
    profileRole: e.profile ? (e.profile.role as AppRole) : null,
    shiftsCount: e._count.shifts,
  }));

  const showBranchFilter = Boolean(user && canAccessAllBranches(user.role));
  const showBranchColumn = showBranchFilter || branches.length > 1;
  const defaultBranchId =
    params.branchId ?? user?.branchId ?? branches[0]?.id;

  return (
    <>
      <DashboardHeader
        title="Сотрудники"
        userLabel={user?.displayName}
        showSignOut={Boolean(user)}
      />
      <div className="space-y-6 p-6">
        {!user ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Войдите в систему, чтобы управлять сотрудниками.
          </div>
        ) : null}

        {user && !canManage ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Раздел доступен старшему администратору и владельцу.
          </div>
        ) : null}

        {canManage ? (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {employees.length} сотрудников
                {showBranchFilter && params.branchId
                  ? ` · фильтр по филиалу`
                  : showBranchFilter
                    ? " · все филиалы"
                    : branches[0]
                      ? ` · ${branches[0].name}`
                      : ""}
              </p>
              {user ? (
                <EmployeeFormDialog
                  branches={branches}
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

            <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-muted/30" />}>
              <EmployeesFilters
                branches={branches}
                showBranchFilter={showBranchFilter}
                initialBranchId={params.branchId ?? "all"}
              />
            </Suspense>

            <EmployeesTable
              employees={employees}
              showBranchColumn={showBranchColumn}
              branches={branches}
              defaultBranchId={defaultBranchId}
              userRole={user!.role}
            />
          </>
        ) : null}
      </div>
    </>
  );
}
