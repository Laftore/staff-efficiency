import { z } from "zod";

export const branchFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Минимум 2 символа")
    .max(100, "Слишком длинное название"),
  address: z.string().trim().max(200, "Слишком длинный адрес"),
});

export const updateBranchSchema = branchFormSchema.extend({
  id: z.string().min(1),
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;
export type UpdateBranchValues = z.infer<typeof updateBranchSchema>;

export function normalizeBranchForm(values: BranchFormValues) {
  const address = values.address.trim();
  return {
    name: values.name,
    address: address.length > 0 ? address : null,
  };
}
