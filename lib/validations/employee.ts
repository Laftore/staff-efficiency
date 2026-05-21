import { z } from "zod";

export const employeeRoleSchema = z.enum(["ADMIN", "SENIOR_ADMIN"], {
  message: "Выберите роль",
});

export const employeeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Минимум 2 символа")
    .max(100, "Слишком длинное имя"),
  role: employeeRoleSchema,
  branchId: z.string().min(1, "Выберите филиал"),
  profileEmail: z.string().trim().superRefine((val, ctx) => {
      if (val.length === 0) return;
      const check = z.string().email("Некорректный email").safeParse(val);
      if (!check.success) {
        ctx.addIssue({
          code: "custom",
          message: check.error.issues[0]?.message ?? "Некорректный email",
        });
      }
    }),
});

/** Нормализованные значения после валидации (пустой email → без привязки). */
export function normalizeEmployeeForm(values: EmployeeFormValues) {
  const email = values.profileEmail.trim().toLowerCase();
  return {
    ...values,
    profileEmail: email.length > 0 ? email : undefined,
  };
}

export const updateEmployeeSchema = employeeFormSchema.extend({
  id: z.string().min(1),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
export type UpdateEmployeeValues = z.infer<typeof updateEmployeeSchema>;
