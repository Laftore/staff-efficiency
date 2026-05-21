import { signOut } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  title: string;
  branchName?: string;
  userLabel?: string;
  showSignOut?: boolean;
}

export function DashboardHeader({
  title,
  branchName,
  userLabel,
  showSignOut = true,
}: DashboardHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">{title}</h1>
        {branchName ? (
          <Badge variant="secondary" className="font-normal">
            {branchName}
          </Badge>
        ) : null}
        {userLabel ? (
          <span className="text-xs text-muted-foreground">{userLabel}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        {showSignOut ? (
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Выход
            </Button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
