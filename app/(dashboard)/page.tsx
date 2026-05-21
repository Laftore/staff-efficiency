import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PeriodToggle } from "@/components/dashboard/period-toggle";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAllBranches } from "@/lib/auth/roles";
import { getDashboardData, type DashboardPeriod } from "@/lib/dashboard/queries";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/env";
import type { AppRole } from "@/types";

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

async function resolveBranchLabel(
  branchId: string | null,
  role: AppRole,
): Promise<string> {
  if (canAccessAllBranches(role)) {
    return "Все филиалы";
  }
  if (!branchId || !isDatabaseConfigured()) {
    return "Филиал не назначен";
  }
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  return branch?.name ?? "Филиал";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const period: DashboardPeriod = params.period === "month" ? "month" : "week";

  const user = await getSessionUser();
  const branchName = user
    ? await resolveBranchLabel(user.branchId, user.role)
    : "Гость (dev)";

  const { kpi, chart, empty } = await getDashboardData(user, period);

  return (
    <>
      <DashboardHeader
        title="Дашборд"
        branchName={branchName}
        userLabel={user ? `${user.displayName} · ${user.role}` : undefined}
        showSignOut={Boolean(user)}
      />
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Главный KPI — бонус за смену (0–1 500 ₽). Данные из сохранённых смен.
          </p>
          <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded-lg bg-muted/40" />}>
            <PeriodToggle period={period} />
          </Suspense>
        </div>

        {!isDatabaseConfigured() ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Подключите DATABASE_URL для отображения реальных KPI.
          </div>
        ) : null}

        {empty && isDatabaseConfigured() ? (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
            За выбранный период смен нет.{" "}
            <a href="/shifts" className="text-primary underline-offset-4 hover:underline">
              Добавить смену
            </a>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Бонус за смену"
            value={kpi.latestBonus}
            subtitle={kpi.latestBonusSubtitle}
            trend={kpi.bonusTrend}
            highlight
          />
          <KpiCard
            title="Выручка"
            value={kpi.revenueTotal}
            subtitle={`Средний бонус: ${kpi.avgBonus}`}
          />
          <KpiCard
            title="Выполнение плана"
            value={kpi.planPercent}
            subtitle={kpi.planSubtitle}
          />
          <KpiCard
            title="Смен за период"
            value={kpi.shiftsCount}
            subtitle={period === "week" ? "За 7 дней" : "За 30 дней"}
          />
        </div>

        <DashboardCharts data={chart} period={period} />
      </div>
    </>
  );
}
