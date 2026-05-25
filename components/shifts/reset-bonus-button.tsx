"use client";

import { useActionState } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { resetShiftBonus, type ShiftActionResult } from "@/app/actions/shifts";
import { Button } from "@/components/ui/button";

interface ResetBonusButtonProps {
  shiftId: string;
}

export function ResetBonusButton({ shiftId }: ResetBonusButtonProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: ShiftActionResult | null) => {
      const result = await resetShiftBonus(shiftId);
      if (result.success) {
        toast.success("Бонус обнулен", {
          description: "Смена теперь требует корректировки",
        });
      } else if (result.error) {
        toast.error("Ошибка обнуления бонуса", {
          description: result.error,
        });
      }
      return result;
    },
    null,
  );

  return (
    <form action={formAction}>
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        className="border-destructive/50 text-destructive hover:bg-destructive/10"
      >
        <Ban className="size-3.5" />
        {pending ? "…" : "Обнулить"}
      </Button>
    </form>
  );
}
