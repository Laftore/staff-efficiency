import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getSessionUser } from "@/lib/auth/session";
import { canManageBranches } from "@/lib/auth/roles";
import { isDatabaseConfigured } from "@/lib/env";
import { getAuditLogs, AuditAction } from "@/lib/audit/audit.service";
import { listBranchesWithCounts } from "@/lib/branches/queries";
import { AuditLogsTable } from "@/components/audit/audit-logs-table";
import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditExportButton } from "@/components/audit/audit-export-button";

interface AuditPageProps {
  searchParams: Promise<{
    branchId?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const user = await getSessionUser();
  const params = await searchParams;

  const isOwner = user ? canManageBranches(user.role) : false;

  if (!user || !isOwner) {
    return (
      <>
        <DashboardHeader
          title="Аудит действий"
          userLabel={user?.displayName}
          showSignOut={Boolean(user)}
        />
        <div className="p-6">
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Доступ к журналу аудита разрешён только владельцу (OWNER).
          </div>
        </div>
      </>
    );
  }

  const branches = await listBranchesWithCounts();
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const pageSize = 25;

  const fromDate = params.from ? new Date(params.from) : undefined;
  const toDate = params.to ? new Date(params.to) : undefined;

  const { logs, total, totalPages } = await getAuditLogs(
    {
      branchId: params.branchId,
      action: params.action as any,
      fromDate,
      toDate,
    },
    {
      page: currentPage,
      pageSize,
    }
  );

  const actions = Object.values(AuditAction);
  const branchNames = Object.fromEntries(branches.map((b) => [b.id, b.name]));

  return (
    <>
      <DashboardHeader
        title="Аудит действий"
        userLabel={user.displayName}
        showSignOut
      />

      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Журнал действий</h2>
          <p className="text-sm text-muted-foreground mt-1">
            История важных операций в системе. Доступно только владельцу.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <AuditFilters
            branches={branches}
            actions={actions}
            currentFilters={{
              branchId: params.branchId,
              action: params.action,
              from: params.from,
              to: params.to,
            }}
          />
          <AuditExportButton logs={logs} branchNames={branchNames} />
        </div>

        <AuditLogsTable logs={logs} branchNames={branchNames} />

        {/* Простая пагинация */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Показано {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} из {total}
          </div>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <a
                href={`/audit?${new URLSearchParams({
                  ...params,
                  page: String(currentPage - 1),
                })}`}
                className="px-3 py-1 rounded border hover:bg-muted"
              >
                ← Назад
              </a>
            )}
            {currentPage < totalPages && (
              <a
                href={`/audit?${new URLSearchParams({
                  ...params,
                  page: String(currentPage + 1),
                })}`}
                className="px-3 py-1 rounded border hover:bg-muted"
              >
                Далее →
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
