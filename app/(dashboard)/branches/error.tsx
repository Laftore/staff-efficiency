"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BranchesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Branches page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Ошибка управления филиалами</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Раздел доступен только владельцу (OWNER). Если вы OWNER — проверьте подключение к базе данных.
        </p>
        <Button onClick={reset} variant="outline" className="mt-6 w-full" size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Повторить
        </Button>
      </div>
    </div>
  );
}
