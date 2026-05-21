"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BranchOption {
  id: string;
  name: string;
}

interface EmployeesFiltersProps {
  branches: BranchOption[];
  showBranchFilter: boolean;
  initialBranchId?: string;
}

export function EmployeesFilters({
  branches,
  showBranchFilter,
  initialBranchId,
}: EmployeesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [branchId, setBranchId] = useState(initialBranchId ?? "all");

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    if (branchId && branchId !== "all") {
      params.set("branchId", branchId);
    } else {
      params.delete("branchId");
    }
    router.push(`/employees?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/employees");
  }

  if (!showBranchFilter) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/50 p-4 sm:flex-row sm:items-end">
      <div className="min-w-[180px] flex-1 space-y-2">
        <Label>Филиал</Label>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger>
            <SelectValue placeholder="Все филиалы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все филиалы</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={applyFilters}>
          <Filter className="size-4" />
          Применить
        </Button>
        <Button type="button" variant="outline" onClick={clearFilters}>
          Сбросить
        </Button>
      </div>
    </div>
  );
}
