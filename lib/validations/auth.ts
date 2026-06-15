import { z } from "zod";

const loginEmailSchema = z
  .string()
  .trim()
  .min(3, "Введите email")
  .refine((value) => /^[^\s@]+@[^\s@]+$/.test(value), "Введите корректный email");

export const loginSchema = z.object({
  email: loginEmailSchema,
  password: z.string().min(6, "Минимум 6 символов"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
