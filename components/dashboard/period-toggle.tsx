"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DashboardPeriod } from "@/lib/dashboard/queries";

interface PeriodToggleProps {
  period: DashboardPeriod;
}

export function PeriodToggle({ period }: PeriodToggleProps) {
  const searchParams = useSearchParams();
  const base = new URLSearchParams(searchParams.toString());

  function href(p: DashboardPeriod) {
    const params = new URLSearchParams(base);
    params.set("period", p);
    return `/?${params.toString()}`;
  }

  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1">
      {(["week", "month"] as const).map((p) => (
        <Link
          key={p}
          href={href(p)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            period === p
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p === "week" ? "Неделя" : "Месяц"}
        </Link>
      ))}
    </div>
  );
}
