import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
          <FileQuestion className="h-9 w-9 text-muted-foreground" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Страница не найдена
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Запрашиваемая страница не существует или была перемещена.
        </p>

        <Button asChild className="mt-6 w-full" size="lg">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Вернуться на главную
          </Link>
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        StaffEfficiency • 404
      </p>
    </div>
  );
}
