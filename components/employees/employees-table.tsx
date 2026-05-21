"use client";

import {
  EmployeeFormDialog,
  type EmployeeFormInitial,
} from "@/components/employees/employee-form-dialog";
import { formatRoleLabel } from "@/lib/employees/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppRole } from "@/types";
import { Link2, Link2Off, User } from "lucide-react";

export interface EmployeeRow {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  profileId: string | null;
  profileEmail: string | null;
  profileDisplayName: string | null;
  profileRole: AppRole | null;
  shiftsCount: number;
}

interface BranchOption {
  id: string;
  name: string;
}

interface EmployeesTableProps {
  employees: EmployeeRow[];
  showBranchColumn: boolean;
  branches: BranchOption[];
  defaultBranchId?: string;
  userRole: AppRole;
}

function toFormInitial(employee: EmployeeRow): EmployeeFormInitial {
  const role =
    employee.profileRole === "SENIOR_ADMIN" ? "SENIOR_ADMIN" : "ADMIN";
  return {
    id: employee.id,
    name: employee.name,
    role,
    branchId: employee.branchId,
    profileEmail: employee.profileEmail ?? "",
  };
}

function roleBadgeVariant(role: AppRole): "default" | "secondary" | "outline" {
  if (role === "SENIOR_ADMIN") return "default";
  if (role === "ADMIN") return "secondary";
  return "outline";
}

export function EmployeesTable({
  employees,
  showBranchColumn,
  branches,
  defaultBranchId,
  userRole,
}: EmployeesTableProps) {
  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-muted-foreground">
        Сотрудники не найдены. Измените фильтр или добавьте нового сотрудника.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                <User className="size-3.5 opacity-70" />
                Имя
              </span>
            </TableHead>
            {showBranchColumn ? <TableHead>Филиал</TableHead> : null}
            <TableHead>Доступ в приложение</TableHead>
            <TableHead className="text-right">Смен</TableHead>
            <TableHead className="w-[120px] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">{employee.name}</TableCell>
              {showBranchColumn ? (
                <TableCell className="text-muted-foreground">{employee.branchName}</TableCell>
              ) : null}
              <TableCell>
                {employee.profileId ? (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Link2 className="size-3.5 text-primary" />
                      {employee.profileEmail ?? employee.profileDisplayName}
                    </span>
                    {employee.profileRole ? (
                      <Badge variant={roleBadgeVariant(employee.profileRole)} className="w-fit">
                        {formatRoleLabel(employee.profileRole)}
                      </Badge>
                    ) : null}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Link2Off className="size-3.5" />
                    Не привязан
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{employee.shiftsCount}</TableCell>
              <TableCell className="text-right">
                <EmployeeFormDialog
                  branches={branches}
                  defaultBranchId={defaultBranchId}
                  initial={toFormInitial(employee)}
                  userRole={userRole}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
