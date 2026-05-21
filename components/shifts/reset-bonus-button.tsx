"use client";

import { useTransition } from "react";
import { Ban } from "lucide-react";
import { resetShiftBonus } from "@/app/actions/shifts";
import { Button } from "@/components/ui/button";

interface ResetBonusButtonProps {
  shiftId: string;
}

export function ResetBonusButton({ shiftId }: ResetBonusButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className="border-destructive/50 text-destructive hover:bg-destructive/10"
      onClick={() => {
        startTransition(async () => {
          await resetShiftBonus(shiftId);
        });
      }}
    >
      <Ban className="size-3.5" />
      {pending ? "…" : "Обнулить"}
    </Button>
  );
}
