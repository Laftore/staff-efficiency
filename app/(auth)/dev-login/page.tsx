import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DEMO_ACCOUNTS = [
  {
    role: "OWNER",
    label: "Владелец",
    name: "Андрей Владимиров",
    branchId: null,
    href: "/",
  },
  {
    role: "SENIOR_ADMIN",
    label: "Старший админ · Центральный",
    name: "Светлана Петрова",
    branchId: "branch_central",
    href: "/",
  },
  {
    role: "ADMIN",
    label: "Админ · Центральный",
    name: "Алексей Морозов",
    branchId: "branch_central",
    href: "/",
  },
  {
    role: "ADMIN",
    label: "Админ · Южный",
    name: "Никита Белов",
    branchId: "branch_south",
    href: "/",
  },
] as const;

function isDevLoginEnabled() {
  return (
    process.env.E2E_AUTH_MOCK === "1" && process.env.NODE_ENV !== "production"
  );
}

export default async function DevLoginPage() {
  if (!isDevLoginEnabled()) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-primary/30 bg-card/90 shadow-[0_0_40px_-12px] shadow-primary/30">
        <CardHeader>
          <CardTitle>Демо-вход</CardTitle>
          <CardDescription>
            Режим для скриншотов и защиты ВКР. Выберите роль — откроется
            дашборд с тестовыми данными.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DEMO_ACCOUNTS.map((account) => (
            <form
              key={`${account.role}-${account.branchId}`}
              action="/api/dev-login"
              method="POST"
              className="block"
            >
              <input type="hidden" name="role" value={account.role} />
              {account.branchId ? (
                <input type="hidden" name="branchId" value={account.branchId} />
              ) : null}
              <Button
                type="submit"
                variant={account.role === "OWNER" ? "default" : "outline"}
                className="h-auto w-full flex-col items-start gap-0.5 py-3"
              >
                <span className="font-semibold">{account.label}</span>
                <span className="text-xs font-normal opacity-80">
                  {account.name}
                </span>
              </Button>
            </form>
          ))}
          <p className="pt-2 text-center text-xs text-muted-foreground">
            <Link href="/login" className="underline-offset-4 hover:underline">
              Обычный вход
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}