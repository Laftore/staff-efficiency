import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BranchFormDialog } from "@/components/branches/branch-form-dialog";
import { BranchesTable, type BranchRow } from "@/components/branches/branches-table";
import { getSessionUser } from "@/lib/auth/session";
import { canManageBranches } from "@/lib/auth/roles";
import { listBranchesWithCounts } from "@/lib/branches/queries";
import { isDatabaseConfigured } from "@/lib/env";

export default async function BranchesPage() {
  const user = await getSessionUser();
  const isOwner = user ? canManageBranches(user.role) : false;
  const branchesRaw = isOwner ? await listBranchesWithCounts() : [];

  const branches: BranchRow[] = branchesRaw.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    employeesCount: b._count.employees,
    shiftsCount: b._count.shifts,
    profilesCount: b._count.profiles,
  }));

  return (
    <>
      <DashboardHeader
        title="Филиалы"
        userLabel={user?.displayName}
        showSignOut={Boolean(user)}
      />
      <div className="space-y-6 p-6">
        {!user ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Войдите в систему для управления филиалами.
          </div>
        ) : null}

        {user && !isOwner ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Управление филиалами доступно только владельцу (OWNER).
          </div>
        ) : null}

        {isOwner ? (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {branches.length} филиалов · tenant для multi-branch и RLS
              </p>
              <BranchFormDialog />
            </div>

            {!isDatabaseConfigured() ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Подключите DATABASE_URL в .env.local и выполните{" "}
                <code className="text-xs">npx prisma migrate deploy && npm run db:seed</code>
              </div>
            ) : null}

            <BranchesTable branches={branches} />
          </>
        ) : null}
      </div>
    </>
  );
}
