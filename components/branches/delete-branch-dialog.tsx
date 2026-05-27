"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteBranch } from "@/app/actions/branches";
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

interface DeleteBranchDialogProps {
  branchId: string;
  branchName: string;
  employeesCount: number;
  shiftsCount: number;
  profilesCount: number;
}

export function DeleteBranchDialog({
  branchId,
  branchName,
  employeesCount,
  shiftsCount,
  profilesCount,
}: DeleteBranchDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const hasLinks = employeesCount > 0 || shiftsCount > 0 || profilesCount > 0;

  async function handleDelete() {
    setPending(true);
    try {
      const result = await deleteBranch(branchId);
      if (result.error) {
        toast.error("Ошибка удаления филиала", {
          description: result.error,
        });
        return;
      }

      toast.success(`Филиал «${branchName}» удалён`);
      router.refresh();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Удалить
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Удалить филиал?</DialogTitle>
          <DialogDescription>
            Филиал «{branchName}» будет удалён без возможности восстановления.
          </DialogDescription>
        </DialogHeader>

        {hasLinks ? (
          <p className="text-sm text-amber-100/90">
            Связано: {employeesCount} сотрудников, {shiftsCount} смен, {profilesCount} профилей.
            Удаление недоступно, пока есть привязанные данные.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            У филиала нет сотрудников, смен и профилей — удаление безопасно.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || hasLinks}
            onClick={handleDelete}
          >
            {pending ? "Удаление…" : "Удалить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
