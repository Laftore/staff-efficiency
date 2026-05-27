"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-9 w-9 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Произошла ошибка
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Что-то пошло не так при загрузке приложения. Мы уже работаем над исправлением.
        </p>

        {error?.message && (
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </p>
        )}

        <Button onClick={reset} className="mt-6 w-full" size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Попробовать снова
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        StaffEfficiency • Кибер-тёмная тема
      </p>
    </div>
  );
}
