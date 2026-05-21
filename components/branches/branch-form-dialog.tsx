"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { createBranch, updateBranch } from "@/app/actions/branches";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { branchFormSchema, type BranchFormValues } from "@/lib/validations/branch";

export interface BranchFormInitial {
  id: string;
  name: string;
  address: string;
}

interface BranchFormDialogProps {
  initial?: BranchFormInitial;
  triggerLabel?: string;
}

export function BranchFormDialog({ initial, triggerLabel }: BranchFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(initial?.id);

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: initial?.name ?? "",
      address: initial?.address ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: initial?.name ?? "",
        address: initial?.address ?? "",
      });
      setServerError(null);
    }
  }, [open, initial, form]);

  async function onSubmit(values: BranchFormValues) {
    setServerError(null);
    setPending(true);
    try {
      const result =
        isEdit && initial?.id
          ? await updateBranch({ ...values, id: initial.id })
          : await createBranch(values);

      if (result.error) {
        setServerError(result.error);
        return;
      }
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button type="button" variant="ghost" size="sm">
            <Pencil className="size-3.5" />
            {triggerLabel ?? "Изменить"}
          </Button>
        ) : (
          <Button type="button">
            <Plus className="size-4" />
            {triggerLabel ?? "Добавить филиал"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактирование филиала" : "Новый филиал"}</DialogTitle>
          <DialogDescription>
            Название отображается в фильтрах и сменах. Адрес — опционально.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Центральный" autoComplete="organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Адрес</FormLabel>
                  <FormControl>
                    <Input placeholder="ул. Примерная, 1" autoComplete="street-address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? (
              <p className="text-sm text-destructive" role="alert">
                {serverError}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Сохранение…" : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
