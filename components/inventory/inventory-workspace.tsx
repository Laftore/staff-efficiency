"use client";

import { useRouter } from "next/navigation";
import { InventoryTable, type InventoryRowInitial } from "@/components/inventory/inventory-table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ShiftOptionClient {
  id: string;
  label: string;
}

interface InventoryWorkspaceProps {
  shifts: ShiftOptionClient[];
  activeShiftId?: string;
  rows: InventoryRowInitial[];
}

export function InventoryWorkspace({
  shifts,
  activeShiftId,
  rows,
}: InventoryWorkspaceProps) {
  const router = useRouter();

  if (shifts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-muted-foreground">
        Нет смен за последние 14 дней. Создайте смену в разделе «Смены», затем вернитесь сюда.
      </div>
    );
  }

  const shiftId = activeShiftId && shifts.some((s) => s.id === activeShiftId)
    ? activeShiftId
    : shifts[0].id;

  return (
    <div className="space-y-6">
      <div className="max-w-xl space-y-2">
        <Label>Смена</Label>
        <Select
          value={shiftId}
          onValueChange={(id) => {
            router.push(`/inventory?shiftId=${id}`);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите смену" />
          </SelectTrigger>
          <SelectContent>
            {shifts.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <InventoryTable key={shiftId} shiftId={shiftId} rows={rows} />
    </div>
  );
}
