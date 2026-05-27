"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createEmployee, updateEmployee } from "@/app/actions/employees";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  employeeFormSchema,
  type EmployeeFormValues,
} from "@/lib/validations/employee";
import type { AppRole } from "@/types";

export interface EmployeeFormInitial {
  id: string;
  name: string;
  role: "ADMIN" | "SENIOR_ADMIN";
  branchId: string;
  profileEmail?: string;
}

interface BranchOption {
  id: string;
  name: string;
}

interface EmployeeFormDialogProps {
  branches: BranchOption[];
  defaultBranchId?: string;
  initial?: EmployeeFormInitial;
  triggerLabel?: string;
  userRole: AppRole;
}

const ROLE_OPTIONS: { value: EmployeeFormValues["role"]; label: string }[] = [
  { value: "ADMIN", label: "Администратор" },
  { value: "SENIOR_ADMIN", label: "Старший администратор" },
];

export function EmployeeFormDialog({
  branches,
  defaultBranchId,
  initial,
  triggerLabel,
  userRole,
}: EmployeeFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(initial?.id);
  const canPickBranch = userRole === "OWNER";

  const defaultBranch =
    initial?.branchId ?? defaultBranchId ?? branches[0]?.id ?? "";

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: initial?.name ?? "",
      role: initial?.role ?? "ADMIN",
      branchId: defaultBranch,
      profileEmail: initial?.profileEmail ?? "",
    },
  });

  useEffect(() => {
    if (!canPickBranch && branches[0]) {
      form.setValue("branchId", branches[0].id);
    }
  }, [canPickBranch, branches, form, open]);

  useEffect(() => {
    if (open) {
      form.reset({
        name: initial?.name ?? "",
        role: initial?.role ?? "ADMIN",
        branchId: initial?.branchId ?? defaultBranchId ?? branches[0]?.id ?? "",
        profileEmail: initial?.profileEmail ?? "",
      });
    }
  }, [open, initial, defaultBranchId, branches, form]);

  async function onSubmit(values: EmployeeFormValues) {
    setPending(true);
    try {
      const result = isEdit && initial?.id
        ? await updateEmployee({ ...values, id: initial.id })
        : await createEmployee(values);

      if (result.error) {
        toast.error("Ошибка сохранения сотрудника", {
          description: result.error,
        });
        return;
      }

      toast.success(isEdit ? "Сотрудник обновлён" : "Сотрудник создан");
      router.refresh();
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
            {triggerLabel ?? "Добавить сотрудника"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактирование сотрудника" : "Новый сотрудник"}</DialogTitle>
          <DialogDescription>
            Имя и филиал хранятся в карточке сотрудника. Роль и email применяются к профилю Supabase
            при привязке.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl>
                    <Input placeholder="Иван Петров" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canPickBranch ? (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Филиал</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите филиал" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Филиал: {branches.find((b) => b.id === form.watch("branchId"))?.name ?? "—"}
              </p>
            )}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Роль в приложении</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Роль" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Обновляет profiles.role при привязке по email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profileEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email профиля (Supabase)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      autoComplete="email"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Оставьте пустым, чтобы отвязать профиль. Пользователь должен существовать в
                    Supabase Auth.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
