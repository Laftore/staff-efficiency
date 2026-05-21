import { prisma } from "@/lib/prisma";
import { branchScopeWhere } from "@/lib/auth/authorization";
import { calculatePercentOverPlan, calculateTotalRevenue } from "@/lib/kpi/bonus";
import { formatCurrency } from "@/lib/shifts/format";
import { isDatabaseConfigured } from "@/lib/env";
import type { SessionUser } from "@/types";
import type { Prisma, ShiftType } from "@prisma/client";

export type DashboardPeriod = "week" | "month";

export interface DashboardChartPoint {
  label: string;
  date: string;
  bonus: number;
  revenue: number;
  shifts: number;
}

export interface DashboardKpi {
  latestBonus: string;
  latestBonusSubtitle: string;
  avgBonus: string;
  revenueTotal: string;
  planPercent: string;
  planSubtitle: string;
  shiftsCount: string;
  bonusTrend?: number;
}

export interface DashboardData {
  kpi: DashboardKpi;
  chart: DashboardChartPoint[];
  period: DashboardPeriod;
  empty: boolean;
}

function periodStart(period: DashboardPeriod): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "week") {
    d.setDate(d.getDate() - 6);
  } else {
    d.setDate(d.getDate() - 29);
  }
  return d;
}

function previousPeriodRange(period: DashboardPeriod): { from: Date; to: Date } {
  const to = periodStart(period);
  to.setMilliseconds(-1);
  const from = new Date(to);
  if (period === "week") {
    from.setDate(from.getDate() - 6);
  } else {
    from.setDate(from.getDate() - 29);
  }
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function shiftWhere(
  user: SessionUser | null,
  dateFrom: Date,
  dateTo?: Date,
): Prisma.ShiftWhereInput {
  const where: Prisma.ShiftWhereInput = {
    date: dateTo ? { gte: dateFrom, lte: dateTo } : { gte: dateFrom },
  };
  if (user) {
    Object.assign(where, branchScopeWhere(user));
    if (user.role === "ADMIN") {
      where.employee = { profileId: user.id };
    }
  }
  return where;
}

function avgBonus(shifts: { bonus: number }[]): number {
  if (shifts.length === 0) return 0;
  return shifts.reduce((s, sh) => s + sh.bonus, 0) / shifts.length;
}

function buildChartPoints(
  shifts: {
    date: Date;
    bonus: number;
    revenueTariff: number;
    revenueGoods: number;
  }[],
  period: DashboardPeriod,
): DashboardChartPoint[] {
  const days = period === "week" ? 7 : 30;
  const start = periodStart(period);
  const byDay = new Map<string, { bonus: number; revenue: number; shifts: number }>();

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { bonus: 0, revenue: 0, shifts: 0 });
  }

  for (const s of shifts) {
    const key = s.date.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.bonus += s.bonus;
    bucket.revenue += s.revenueTariff + s.revenueGoods;
    bucket.shifts += 1;
  }

  return Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    label: new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: period === "month" ? "short" : undefined,
    }).format(new Date(date)),
    bonus: Math.round(v.bonus),
    revenue: Math.round(v.revenue),
    shifts: v.shifts,
  }));
}

const EMPTY_KPI: DashboardKpi = {
  latestBonus: "—",
  latestBonusSubtitle: "Нет смен за период",
  avgBonus: "—",
  revenueTotal: "—",
  planPercent: "—",
  planSubtitle: "—",
  shiftsCount: "0",
};

/**
 * KPI и данные графиков за неделю или месяц.
 */
export async function getDashboardData(
  user: SessionUser | null,
  period: DashboardPeriod,
): Promise<DashboardData> {
  if (!isDatabaseConfigured()) {
    return { kpi: EMPTY_KPI, chart: [], period, empty: true };
  }

  const from = periodStart(period);
  const shifts = await prisma.shift.findMany({
    where: shiftWhere(user, from),
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      date: true,
      type: true,
      bonus: true,
      revenueTariff: true,
      revenueGoods: true,
      bonusAdjustment: true,
    },
  });

  if (shifts.length === 0) {
    return {
      kpi: EMPTY_KPI,
      chart: buildChartPoints([], period),
      period,
      empty: true,
    };
  }

  const latest = shifts[0];
  const avg = avgBonus(shifts);
  const totalRevenue = shifts.reduce(
    (s, sh) => s + calculateTotalRevenue(sh.revenueTariff, sh.revenueGoods),
    0,
  );

  const planValues = shifts.map((sh) => {
    const total = calculateTotalRevenue(sh.revenueTariff, sh.revenueGoods);
    const plan =
      sh.type === "DAY" ? 15_000 : 5_000;
    return calculatePercentOverPlan(total, plan);
  });
  const avgPlan =
    planValues.length > 0
      ? Math.round(planValues.reduce((a, b) => a + b, 0) / planValues.length)
      : 0;

  const prev = previousPeriodRange(period);
  const prevShifts = await prisma.shift.findMany({
    where: shiftWhere(user, prev.from, prev.to),
    select: { bonus: true },
  });
  const prevAvg = avgBonus(prevShifts);
  const bonusTrend =
    prevAvg > 0 ? Math.round(((avg - prevAvg) / prevAvg) * 100) : undefined;

  const kpi: DashboardKpi = {
    latestBonus: formatCurrency(latest.bonus),
    latestBonusSubtitle: `Средний за ${period === "week" ? "неделю" : "месяц"}: ${formatCurrency(Math.round(avg))}`,
    avgBonus: formatCurrency(Math.round(avg)),
    revenueTotal: formatCurrency(Math.round(totalRevenue)),
    planPercent: `${avgPlan > 0 ? "+" : ""}${avgPlan}%`,
    planSubtitle: `Средний O за ${shifts.length} смен`,
    shiftsCount: String(shifts.length),
    bonusTrend,
  };

  return {
    kpi,
    chart: buildChartPoints(shifts, period),
    period,
    empty: false,
  };
}
