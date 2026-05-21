"use client";

import { BranchFormDialog } from "@/components/branches/branch-form-dialog";
import { DeleteBranchDialog } from "@/components/branches/delete-branch-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, MapPin } from "lucide-react";

export interface BranchRow {
  id: string;
  name: string;
  address: string | null;
  employeesCount: number;
  shiftsCount: number;
  profilesCount: number;
}

interface BranchesTableProps {
  branches: BranchRow[];
}

export function BranchesTable({ branches }: BranchesTableProps) {
  if (branches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-muted-foreground">
        Филиалы не найдены. Добавьте первый филиал.
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
                <Building2 className="size-3.5 opacity-70" />
                Название
              </span>
            </TableHead>
            <TableHead>Адрес</TableHead>
            <TableHead className="text-right">Сотрудников</TableHead>
            <TableHead className="w-[200px] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((branch) => (
            <TableRow key={branch.id}>
              <TableCell className="font-medium">{branch.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {branch.address ? (
                  <span className="inline-flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 opacity-70" />
                    {branch.address}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{branch.employeesCount}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <BranchFormDialog
                    initial={{
                      id: branch.id,
                      name: branch.name,
                      address: branch.address ?? "",
                    }}
                  />
                  <DeleteBranchDialog
                    branchId={branch.id}
                    branchName={branch.name}
                    employeesCount={branch.employeesCount}
                    shiftsCount={branch.shiftsCount}
                    profilesCount={branch.profilesCount}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
