"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
import { getAuditActionLabel } from "@/lib/audit/labels";

interface Branch {
  id: string;
  name: string;
}

interface AuditFiltersProps {
  branches: Branch[];
  actions: string[];
  currentFilters: {
    branchId?: string;
    action?: string;
    from?: string;
    to?: string;
  };
}

export function AuditFilters({ branches, actions, currentFilters }: AuditFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // reset pagination
    router.push(`/audit?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/audit");
  };

  return (
    <div className="flex flex-wrap gap-4 items-end border rounded-xl p-4 bg-card">
      <div className="space-y-1.5">
        <Label>Филиал</Label>
        <Select
          value={currentFilters.branchId || "all"}
          onValueChange={(val) => updateFilter("branchId", val === "all" ? undefined : val)}
        >
          <SelectTrigger className="w-[200px]">
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

      <div className="space-y-1.5">
        <Label>Тип действия</Label>
        <Select
          value={currentFilters.action || "all"}
          onValueChange={(val) => updateFilter("action", val === "all" ? undefined : val)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Все действия" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все действия</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {getAuditActionLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>С даты</Label>
        <Input
          type="date"
          value={currentFilters.from || ""}
          onChange={(e) => updateFilter("from", e.target.value || undefined)}
          className="w-[160px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label>По дату</Label>
        <Input
          type="date"
          value={currentFilters.to || ""}
          onChange={(e) => updateFilter("to", e.target.value || undefined)}
          className="w-[160px]"
        />
      </div>

      <Button variant="outline" onClick={clearFilters}>
        Сбросить фильтры
      </Button>
    </div>
  );
}
