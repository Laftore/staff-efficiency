import { z } from "zod";

export const shiftTypeSchema = z.enum(["DAY", "NIGHT", "EXTRA"]);

export const shiftFormSchema = z.object({
  branchId: z.string().min(1, "Выберите филиал"),
  employeeId: z.string().min(1, "Выберите сотрудника"),
  date: z.coerce.date(),
  type: shiftTypeSchema,
  revenueTariff: z.coerce.number().min(0, "Не меньше 0"),
  revenueGoods: z.coerce.number().min(0, "Не меньше 0"),
  bonusAdjustment: z.coerce.number().default(0),
});

export const updateShiftSchema = shiftFormSchema.extend({
  id: z.string().min(1),
});

export type ShiftFormValues = z.infer<typeof shiftFormSchema>;
