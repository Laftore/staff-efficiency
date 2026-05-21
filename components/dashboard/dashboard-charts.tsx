"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardChartPoint, DashboardPeriod } from "@/lib/dashboard/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardChartsProps {
  data: DashboardChartPoint[];
  period: DashboardPeriod;
}

function formatTooltipValue(value: number, name: string): [string, string] {
  if (name === "revenue" || name === "bonus") {
    return [
      new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0,
      }).format(value),
      name === "bonus" ? "Бонус" : "Выручка",
    ];
  }
  return [String(value), "Смен"];
}

export function DashboardCharts({ data, period }: DashboardChartsProps) {
  const hasData = data.some((d) => d.bonus > 0 || d.revenue > 0 || d.shifts > 0);
  const periodLabel = period === "week" ? "7 дней" : "30 дней";

  if (!hasData) {
    return (
      <Card className="border-border/60 bg-card/50">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Нет данных для графиков. Добавьте смены в разделе «Смены».
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Бонус по дням</CardTitle>
          <CardDescription>Сумма бонусов за смены · {periodLabel}</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                interval={period === "month" ? 4 : 0}
              />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                formatter={(value, name) =>
                  formatTooltipValue(Number(value), String(name))
                }
              />
              <Bar
                dataKey="bonus"
                name="bonus"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Выручка и смены</CardTitle>
          <CardDescription>Динамика за {periodLabel}</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                interval={period === "month" ? 4 : 0}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                formatter={(value, name) => {
                  if (name === "shifts") return [String(value), "Смен"];
                  return formatTooltipValue(Number(value), String(name));
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Выручка"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="shifts"
                name="Смен"
                stroke="var(--chart-3)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
