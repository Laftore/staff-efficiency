"use client";

import { calculateShiftBonus } from "@/lib/kpi/bonus";
import { formatCurrency, formatDate, formatShiftType } from "@/lib/shifts/format";
import { ResetBonusButton } from "@/components/shifts/reset-bonus-button";
import { ShiftFormDialog, type ShiftFormInitial } from "@/components/shifts/shift-form-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppRole, ShiftType } from "@/types";

export interface ShiftRow {
  id: string;
  branchId: string;
  branchName: string;
  employeeId: string;
  employeeName: string;
  date: string;
  type: ShiftType;
  revenueTariff: number;
  revenueGoods: number;
  bonusAdjustment: number;
  bonus: number;
  bonusManualReset: boolean;
}

interface ShiftsTableProps {
  shifts: ShiftRow[];
  canResetBonus: boolean;
  canEdit: boolean;
  branches: { id: string; name: string }[];
  employeesByBranch: Record<string, { id: string; name: string }[]>;
  defaultBranchId?: string;
  userRole: AppRole;
}

export function ShiftsTable({
  shifts,
  canResetBonus,
  canEdit,
  branches,
  employeesByBranch,
  defaultBranchId,
  userRole,
}: ShiftsTableProps) {
  if (shifts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-muted-foreground">
        Смены не найдены. Измените фильтры или добавьте новую смену.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead>Дата</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Филиал</TableHead>
            <TableHead>Сотрудник</TableHead>
            <TableHead className="text-right">Выручка</TableHead>
            <TableHead className="text-right">Бонус</TableHead>
            <TableHead className="w-[140px] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => {
            const revenue = shift.revenueTariff + shift.revenueGoods;
            const calc = calculateShiftBonus({
              revenueTariff: shift.revenueTariff,
              revenueGoods: shift.revenueGoods,
              shiftType: shift.type,
              bonusAdjustment: shift.bonusAdjustment,
              bonusManualReset: shift.bonusManualReset,
            });
            const showReset = canResetBonus && calc.needsReset;

            const editInitial: ShiftFormInitial = {
              id: shift.id,
              branchId: shift.branchId,
              employeeId: shift.employeeId,
              date: shift.date.slice(0, 10),
              type: shift.type,
              revenueTariff: shift.revenueTariff,
              revenueGoods: shift.revenueGoods,
              bonusAdjustment: shift.bonusAdjustment,
            };

            return (
              <TableRow key={shift.id}>
                <TableCell className="font-medium">{formatDate(new Date(shift.date))}</TableCell>
                <TableCell>
                  <Badge variant="outline">{formatShiftType(shift.type)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{shift.branchName}</TableCell>
                <TableCell>{shift.employeeName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(revenue)}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      shift.bonusManualReset
                        ? "text-muted-foreground line-through"
                        : "font-semibold text-primary tabular-nums"
                    }
                  >
                    {formatCurrency(shift.bonus)}
                  </span>
                  {shift.bonusManualReset ? (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      обнулён
                    </Badge>
                  ) : null}
                  {calc.needsReset && !shift.bonusManualReset ? (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Q {"<"} 0
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canEdit ? (
                      <ShiftFormDialog
                        branches={branches}
                        employeesByBranch={employeesByBranch}
                        defaultBranchId={defaultBranchId}
                        initial={editInitial}
                        userRole={userRole}
                        triggerLabel="Изменить"
                      />
                    ) : null}
                    {showReset ? <ResetBonusButton shiftId={shift.id} /> : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
