import Link from "next/link";
import { Zap } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const authError = error === "auth" ? "Ошибка входа. Попробуйте снова." : null;

  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/15">
          <Zap className="size-6 text-primary" />
        </div>
        <CardTitle>StaffEfficiency</CardTitle>
        <CardDescription>Вход для владельца и администраторов</CardDescription>
      </CardHeader>
      <CardContent>
        {!isSupabaseConfigured() ? (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Supabase не настроен: скопируйте <code className="text-xs">.env.example</code> →{" "}
            <code className="text-xs">.env.local</code>
          </p>
        ) : null}
        {authError ? (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {authError}
          </p>
        ) : null}
        <LoginForm />
        {!isSupabaseConfigured() ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Дашборд без авторизации (dev)
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
