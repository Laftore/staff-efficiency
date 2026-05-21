"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Filter } from "lucide-react";
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

interface BranchOption {
  id: string;
  name: string;
}

interface ShiftsFiltersProps {
  branches: BranchOption[];
  showBranchFilter: boolean;
  initialBranchId?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
}

export function ShiftsFilters({
  branches,
  showBranchFilter,
  initialBranchId,
  initialDateFrom,
  initialDateTo,
}: ShiftsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [branchId, setBranchId] = useState(initialBranchId ?? "all");
  const [dateFrom, setDateFrom] = useState(initialDateFrom ?? "");
  const [dateTo, setDateTo] = useState(initialDateTo ?? "");

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    if (branchId && branchId !== "all") {
      params.set("branchId", branchId);
    } else {
      params.delete("branchId");
    }
    if (dateFrom) params.set("dateFrom", dateFrom);
    else params.delete("dateFrom");
    if (dateTo) params.set("dateTo", dateTo);
    else params.delete("dateTo");
    router.push(`/shifts?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/shifts");
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/50 p-4 md:flex-row md:flex-wrap md:items-end">
      {showBranchFilter ? (
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
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="dateFrom">С даты</Label>
        <Input
          id="dateFrom"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full min-w-[140px]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dateTo">По дату</Label>
        <Input
          id="dateTo"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full min-w-[140px]"
        />
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
