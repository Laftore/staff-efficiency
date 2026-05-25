"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveShift, type ShiftActionResult } from "@/app/actions/shifts";
import { calculateShiftBonus } from "@/lib/kpi/bonus";
import { formatCurrency } from "@/lib/shifts/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppRole, ShiftType } from "@/types";

export interface ShiftFormInitial {
  id?: string;
  branchId: string;
  employeeId: string;
  date: string;
  type: ShiftType;
  revenueTariff: number;
  revenueGoods: number;
  bonusAdjustment: number;
}

interface EmployeeOption {
  id: string;
  name: string;
}

interface BranchOption {
  id: string;
  name: string;
}

interface ShiftFormDialogProps {
  branches: BranchOption[];
  employeesByBranch: Record<string, EmployeeOption[]>;
  defaultBranchId?: string;
  initial?: ShiftFormInitial;
  triggerLabel?: string;
  userRole: AppRole;
}

const SHIFT_TYPES: { value: ShiftType; label: string }[] = [
  { value: "DAY", label: "День (план 15 000 ₽)" },
  { value: "NIGHT", label: "Ночь (план 5 000 ₽)" },
  { value: "EXTRA", label: "Доп (план 5 000 ₽)" },
];

export function ShiftFormDialog({
  branches,
  employeesByBranch,
  defaultBranchId,
  initial,
  triggerLabel,
  userRole,
}: ShiftFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(initial?.id);

  const [branchId, setBranchId] = useState(
    initial?.branchId ?? defaultBranchId ?? branches[0]?.id ?? "",
  );
  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<ShiftType>(initial?.type ?? "DAY");
  const [revenueTariff, setRevenueTariff] = useState(String(initial?.revenueTariff ?? 0));
  const [revenueGoods, setRevenueGoods] = useState(String(initial?.revenueGoods ?? 0));
  const [bonusAdjustment, setBonusAdjustment] = useState(
    String(initial?.bonusAdjustment ?? 0),
  );

  const [state, formAction, pending] = useActionState(
    async (prev: ShiftActionResult | null, formData: FormData) => saveShift(prev, formData),
    null,
  );

  const employees = employeesByBranch[branchId] ?? [];
  const canPickBranch = userRole === "OWNER" || userRole === "SENIOR_ADMIN";

  useEffect(() => {
    if (state?.success) {
      toast.success(isEdit ? "Смена обновлена" : "Смена создана", {
        description: "Бонус пересчитан автоматически",
      });
      setOpen(false);
    }
  }, [state?.success, isEdit]);

  useEffect(() => {
    if (state?.error) {
      toast.error("Ошибка сохранения смены", {
        description: state.error,
      });
    }
  }, [state?.error]);

  useEffect(() => {
    if (open && initial) {
      setBranchId(initial.branchId);
      setEmployeeId(initial.employeeId);
      setDate(initial.date);
      setType(initial.type);
      setRevenueTariff(String(initial.revenueTariff));
      setRevenueGoods(String(initial.revenueGoods));
      setBonusAdjustment(String(initial.bonusAdjustment));
    }
  }, [open, initial]);

  useEffect(() => {
    if (!employees.some((e) => e.id === employeeId) && employees[0]) {
      setEmployeeId(employees[0].id);
    }
  }, [branchId, employees, employeeId]);

  const preview = useMemo(() => {
    const result = calculateShiftBonus({
      revenueTariff: Number(revenueTariff) || 0,
      revenueGoods: Number(revenueGoods) || 0,
      shiftType: type,
      bonusAdjustment: Number(bonusAdjustment) || 0,
      bonusManualReset: false,
    });
    return result;
  }, [revenueTariff, revenueGoods, type, bonusAdjustment]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button type="button" variant="ghost" size="sm">
            <Pencil className="size-3.5" />
            {triggerLabel ?? "Изменить"}
          </Button>
        ) : (
          <Button type="button">
            <Plus className="size-4" />
            {triggerLabel ?? "Новая смена"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактирование смены" : "Новая смена"}</DialogTitle>
          <DialogDescription>
            Бонус пересчитается автоматически (O → P → Q, лимит 0–1 500 ₽).
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
          <input type="hidden" name="branchId" value={branchId} />
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="type" value={type} />

          {canPickBranch ? (
            <div className="space-y-2">
              <Label>Филиал</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Филиал" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Филиал: {branches.find((b) => b.id === branchId)?.name ?? "—"}
            </p>
          )}

          <div className="space-y-2">
            <Label>Сотрудник</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={employees.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {employees.length === 0 ? (
              <p className="text-xs text-destructive">
                Нет сотрудников в филиале. Создайте Employee с привязкой к профилю.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Дата</Label>
              <Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Тип смены</Label>
              <Select value={type} onValueChange={(v) => setType(v as ShiftType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="revenueTariff">Выручка (тарифы)</Label>
              <Input
                id="revenueTariff"
                name="revenueTariff"
                type="number"
                min={0}
                step={1}
                value={revenueTariff}
                onChange={(e) => setRevenueTariff(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenueGoods">Выручка (товары)</Label>
              <Input
                id="revenueGoods"
                name="revenueGoods"
                type="number"
                min={0}
                step={1}
                value={revenueGoods}
                onChange={(e) => setRevenueGoods(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bonusAdjustment">Премия / штраф</Label>
            <Input
              id="bonusAdjustment"
              name="bonusAdjustment"
              type="number"
              step={1}
              value={bonusAdjustment}
              onChange={(e) => setBonusAdjustment(e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="text-muted-foreground">
              O: <span className="font-medium text-foreground">{preview.percentOverPlan}%</span>
              {" · "}
              P: <span className="font-medium text-foreground">{formatCurrency(preview.baseBonus)}</span>
            </p>
            <p className="mt-1 text-lg font-semibold text-primary">
              Бонус Q: {formatCurrency(preview.finalBonus)}
            </p>
            {preview.needsReset ? (
              <p className="mt-1 text-xs text-destructive">
                Q отрицательный — после сохранения доступно «Обнулить»
              </p>
            ) : null}
          </div>

          {state?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending || !employeeId}>
              {pending ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
