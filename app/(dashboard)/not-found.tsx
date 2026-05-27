import Link from "next/link";
import { FileQuestion, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>

        <h2 className="text-xl font-semibold tracking-tight">Страница не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Раздел дашборда не существует или у вас нет доступа к нему.
        </p>

        <Button asChild variant="outline" className="mt-6 w-full" size="lg">
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Вернуться в дашборд
          </Link>
        </Button>
      </div>
    </div>
  );
}
