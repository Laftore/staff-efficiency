"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { loginSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function signIn(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase не настроен. Заполните переменные в .env.local" };
  }

  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.message === "Invalid login credentials") {
      return {
        error:
          "Неверный email или пароль. Для демо: owner@demo.local / Demo2026! (сначала npm run deploy:setup)",
      };
    }
    return { error: error.message };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
