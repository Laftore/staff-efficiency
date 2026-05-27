"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Package, Save } from "lucide-react";
import { toast } from "sonner";
import { saveInventoryFacts } from "@/app/actions/inventory";
import {
  calculateInventoryLine,
  getDifferenceTone,
} from "@/lib/inventory/calculate";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const router = useRouter();
  const [facts, setFacts] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialRows.map((r) => [r.productName, r.fact])),
  );
  const [pending, startTransition] = useTransition();

  // === DataTable state (нативный React, без tanstack) ===
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");

  type SortKey = "productName" | "sold" | "revenueGoods" | "difference" | "warehouse" | "fact";
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "productName",
    direction: "asc",
  });

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

  // Уникальные категории для фильтра
  const categories = useMemo(() => {
    const unique = Array.from(new Set(initialRows.map((r) => r.category))).sort();
    return unique;
  }, [initialRows]);

  // === Обработанные строки: поиск + фильтр + сортировка ===
  const processedRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let result = computedRows.filter((row) => {
      // 1. Поиск по названию и SKU
      const matchesSearch =
        !term ||
        row.productName.toLowerCase().includes(term) ||
        row.sku.toLowerCase().includes(term);

      // 2. Фильтр по категории
      const matchesCategory =
        categoryFilter === "all" || row.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });

    // 3. Сортировка
    const { key, direction } = sortConfig;
    const dirMultiplier = direction === "asc" ? 1 : -1;

    result = [...result].sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

      switch (key) {
        case "productName":
          valA = a.productName;
          valB = b.productName;
          return valA.localeCompare(valB, "ru") * dirMultiplier;
        case "sold":
          valA = a.sold;
          valB = b.sold;
          break;
        case "revenueGoods":
          valA = a.revenueGoods;
          valB = b.revenueGoods;
          break;
        case "difference":
          valA = a.difference;
          valB = b.difference;
          break;
        case "warehouse":
          valA = a.warehouse;
          valB = b.warehouse;
          break;
        case "fact":
          valA = facts[a.productName] ?? a.fact;
          valB = facts[b.productName] ?? b.fact;
          break;
        default:
          return 0;
      }

      if (valA < valB) return -1 * dirMultiplier;
      if (valA > valB) return 1 * dirMultiplier;
      return 0;
    });

    return result;
  }, [computedRows, searchTerm, categoryFilter, sortConfig, facts]);

  function handleFactChange(productName: string, value: string) {
    const parsed = value === "" ? 0 : Math.max(0, parseInt(value, 10) || 0);
    setFacts((prev) => ({ ...prev, [productName]: parsed }));
  }

  // Переключение сортировки по колонке
  function toggleSort(key: "productName" | "sold" | "revenueGoods" | "difference" | "warehouse" | "fact") {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      // По умолчанию для числовых колонок — desc (большие сверху)
      const defaultDir = key === "productName" ? "asc" : "desc";
      return { key, direction: defaultDir };
    });
  }

  // Вспомогательный компонент для заголовка с иконкой сортировки
  function SortableHeader({
    columnKey,
    children,
  }: {
    columnKey: "productName" | "sold" | "revenueGoods" | "difference" | "warehouse" | "fact";
    children: React.ReactNode;
  }) {
    const isActive = sortConfig.key === columnKey;
    const Icon = isActive
      ? sortConfig.direction === "asc"
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown;

    return (
      <TableHead
        className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
        onClick={() => toggleSort(columnKey)}
      >
        <div className="flex items-center justify-end gap-1.5">
          {children}
          <Icon className={cn("size-3.5", isActive ? "text-primary" : "text-muted-foreground/70")} />
        </div>
      </TableHead>
    );
  }

  function handleSave() {
    startTransition(async () => {
      const items = initialRows.map((r) => ({
        productName: r.productName,
        fact: facts[r.productName] ?? r.fact,
      }));
      const result = await saveInventoryFacts(shiftId, items);
      if (result.error) {
        toast.error("Ошибка сохранения инвентаризации", {
          description: result.error,
        });
      } else {
        toast.success("Инвентаризация сохранена");
        router.refresh();
      }
    });
  }

  const displayedCount = processedRows.length;
  const totalCount = computedRows.length;

  return (
    <div className="space-y-4">
      {/* Верхняя панель с totals и кнопкой сохранения — без изменений */}
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
            Выручка по товарам:{" "}
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

      {/* === Панель управления DataTable === */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3 flex-1">
          {/* Поиск */}
          <div className="flex-1 min-w-[220px]">
            <Label htmlFor="search" className="text-xs text-muted-foreground mb-1.5 block">
              Поиск по товару или SKU
            </Label>
            <Input
              id="search"
              placeholder="Например: Red Bull или RB-001..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Фильтр по категории */}
          <div className="w-full sm:w-56">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Категория</Label>
            <Select
              value={categoryFilter}
              onValueChange={(val) => setCategoryFilter(val as "all" | string)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Счётчик отображаемых строк */}
        <div className="text-xs text-muted-foreground whitespace-nowrap pb-1">
          Показано <span className="font-medium text-foreground">{displayedCount}</span> из{" "}
          <span className="font-medium text-foreground">{totalCount}</span> товаров
        </div>
      </div>

      {/* Таблица с улучшениями */}
      <div className="overflow-x-auto rounded-xl border border-border/60 max-h-[620px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/70">
              <TableHead
                className="min-w-[220px] cursor-pointer select-none hover:bg-muted/60 transition-colors"
                onClick={() => toggleSort("productName")}
              >
                <div className="flex items-center gap-1.5">
                  Товар
                  {sortConfig.key === "productName" ? (
                    sortConfig.direction === "asc" ? (
                      <ArrowUp className="size-3.5 text-primary" />
                    ) : (
                      <ArrowDown className="size-3.5 text-primary" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3.5 text-muted-foreground/70" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">Было</TableHead>
              <TableHead className="text-right">Доставлено</TableHead>
              <TableHead className="text-right">Выставлено</TableHead>

              <SortableHeader columnKey="sold">Продано</SortableHeader>
              <SortableHeader columnKey="revenueGoods">Выручка ₽</SortableHeader>

              <TableHead className="min-w-[88px] text-right">Факт</TableHead>

              <SortableHeader columnKey="difference">Разница</SortableHeader>
              <SortableHeader columnKey="warehouse">Склад</SortableHeader>
            </TableRow>
          </TableHeader>

          <TableBody>
            {processedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  Ничего не найдено по текущим фильтрам
                </TableCell>
              </TableRow>
            ) : (
              processedRows.map((row) => (
                <TableRow key={row.productName} className="hover:bg-muted/20">
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
                  <TableCell className="text-right tabular-nums text-foreground font-medium">
                    {row.sold}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground font-medium">
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
                      className="ml-auto h-8 w-20 text-right tabular-nums focus-visible:ring-primary"
                      value={facts[row.productName] ?? row.fact}
                      onChange={(e) => handleFactChange(row.productName, e.target.value)}
                      aria-label={`Факт: ${row.productName}`}
                    />
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums font-medium", toneClass(row.tone))}>
                    {row.difference > 0 ? "+" : ""}
                    {row.difference}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.warehouse}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Зелёная разница — излишек на полке, красная — недостача. Редактируется только колонка «Факт».
        Данные автоматически пересчитываются при изменении факта.
      </p>
    </div>
  );
}
