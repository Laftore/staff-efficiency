import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  highlight?: boolean;
}

export function KpiCard({ title, value, subtitle, trend, highlight }: KpiCardProps) {
  const trendUp = trend !== undefined && trend >= 0;

  return (
    <Card
      className={cn(
        "border-border/60 bg-card/80 backdrop-blur-sm",
        highlight && "border-primary/50 shadow-[0_0_24px_-8px] shadow-primary/40",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-3xl font-bold tracking-tight tabular-nums",
            highlight && "text-primary",
          )}
        >
          {value}
        </p>
        {subtitle ? (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
        {trend !== undefined ? (
          <div
            className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              trendUp ? "text-emerald-500" : "text-destructive",
            )}
          >
            {trendUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            <span>{trend > 0 ? "+" : ""}{trend}% к прошлой смене</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
