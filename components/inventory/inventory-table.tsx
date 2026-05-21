"use client";

import { useMemo, useState, useTransition } from "react";
import { Package, Save } from "lucide-react";
import { saveInventoryFacts } from "@/app/actions/inventory";
import {
  calculateInventoryLine,
  getDifferenceTone,
} from "@/lib/inventory/calculate";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface InventoryRowInitial {
  productName: string;
  sku: string;
  category: string;
  previousStock: number;
  delivered: number;
  displayed: number;
  sold: number;
  revenueGoods: number;
  fact: number;
}

interface InventoryTableProps {
  shiftId: string;
  rows: InventoryRowInitial[];
}

function toneClass(tone: ReturnType<typeof getDifferenceTone>): string {
  switch (tone) {
    case "positive":
      return "font-semibold text-emerald-500";
    case "negative":
      return "font-semibold text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function InventoryTable({ shiftId, rows: initialRows }: InventoryTableProps) {
  const [facts, setFacts] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialRows.map((r) => [r.productName, r.fact])),
  );
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const computedRows = useMemo(() => {
    return initialRows.map((row) => {
      const fact = facts[row.productName] ?? row.fact;
      const calc = calculateInventoryLine({
        productName: row.productName,
        previousStock: row.previousStock,
        delivered: row.delivered,
        displayed: row.displayed,
        sold: row.sold,
        revenueGoods: row.revenueGoods,
        fact: Number.isFinite(fact) ? Math.max(0, Math.floor(fact)) : 0,
      });
      return { ...row, ...calc, tone: getDifferenceTone(calc.difference) };
    });
  }, [initialRows, facts]);

  const totals = useMemo(() => {
    return computedRows.reduce(
      (acc, r) => ({
        sold: acc.sold + r.sold,
        difference: acc.difference + r.difference,
        revenueGoods: acc.revenueGoods + r.revenueGoods,
      }),
      { sold: 0, difference: 0, revenueGoods: 0 },
    );
  }, [computedRows]);

  function handleFactChange(productName: string, value: string) {
    const parsed = value === "" ? 0 : Math.max(0, parseInt(value, 10) || 0);
    setFacts((prev) => ({ ...prev, [productName]: parsed }));
    setMessage(null);
  }

  function handleSave() {
    startTransition(async () => {
      const items = initialRows.map((r) => ({
        productName: r.productName,
        fact: facts[r.productName] ?? r.fact,
      }));
      const result = await saveInventoryFacts(shiftId, items);
      if (result.error) {
        setMessage({ type: "err", text: result.error });
      } else {
        setMessage({ type: "ok", text: "Инвентаризация сохранена" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <Package className="size-3" />
            Smartshell
          </Badge>
          <span>
            Продано за смену:{" "}
            <strong className="text-foreground">{totals.sold} шт.</strong>
          </span>
          <span>
            Выручка по товарам: {" "}
            <strong className="text-foreground">
              {totals.revenueGoods.toLocaleString("ru-RU", {
                style: "currency",
                currency: "RUB",
                maximumFractionDigits: 0,
              })}
            </strong>
          </span>
          <span>
            Σ разница:{" "}
            <strong className={toneClass(getDifferenceTone(totals.difference))}>
              {totals.difference > 0 ? "+" : ""}
              {totals.difference}
            </strong>
          </span>
        </div>
        <Button type="button" onClick={handleSave} disabled={pending} className="shrink-0">
          <Save className="size-4" />
          {pending ? "Сохранение…" : "Сохранить инвентаризацию"}
        </Button>
      </div>

      {message ? (
        <p
          className={cn(
            "text-sm",
            message.type === "ok" ? "text-emerald-500" : "text-destructive",
          )}
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="min-w-[200px]">Товар</TableHead>
              <TableHead className="text-right">Было</TableHead>
              <TableHead className="text-right">Доставлено</TableHead>
              <TableHead className="text-right">Выставлено</TableHead>
              <TableHead className="text-right">Продано</TableHead>
              <TableHead className="text-right">Выручка ₽</TableHead>
              <TableHead className="min-w-[88px] text-right">Факт</TableHead>
              <TableHead className="text-right">Разница</TableHead>
              <TableHead className="text-right">Продано</TableHead>
              <TableHead className="text-right">Склад</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {computedRows.map((row) => (
              <TableRow key={row.productName}>
                <TableCell>
                  <div className="font-medium">{row.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.sku} · {row.category}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {row.previousStock}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {row.delivered}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {row.displayed}
                </TableCell>
                <TableCell className="text-right tabular-nums text-foreground">
                  {row.sold}
                </TableCell>
                <TableCell className="text-right tabular-nums text-foreground">
                  {row.revenueGoods.toLocaleString("ru-RU", {
                    style: "currency",
                    currency: "RUB",
                    maximumFractionDigits: 0,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    className="ml-auto h-8 w-20 text-right tabular-nums"
                    value={facts[row.productName] ?? row.fact}
                    onChange={(e) => handleFactChange(row.productName, e.target.value)}
                    aria-label={`Факт: ${row.productName}`}
                  />
                </TableCell>
                <TableCell className={cn("text-right tabular-nums", toneClass(row.tone))}>
                  {row.difference > 0 ? "+" : ""}
                  {row.difference}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {row.warehouse}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Зелёная разница — излишек на полке, красная — недостача. Редактируется только колонка «Факт».
      </p>
    </div>
  );
}
