"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, History, LayoutDashboard, Package, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/shifts", label: "Смены", icon: Zap },
  { href: "/inventory", label: "Инвентаризация", icon: Package },
  { href: "/employees", label: "Сотрудники", icon: Users },
] as const;

const ownerNavItem = {
  href: "/branches",
  label: "Филиалы",
  icon: Building2,
} as const;

const ownerAuditItem = {
  href: "/audit",
  label: "Аудит",
  icon: History,
} as const;

interface AppSidebarProps {
  showBranches?: boolean;
}

export function AppSidebar({ showBranches = false }: AppSidebarProps) {
  const pathname = usePathname();
  const ownerItems = showBranches ? [ownerNavItem, ownerAuditItem] : [];
  const navItems = [...baseNavItems, ...ownerItems];

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border/60 bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
        <Zap className="size-5 text-primary" />
        <span className="font-semibold tracking-tight">StaffEfficiency</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="px-4 pb-4 text-xs text-muted-foreground">Кибер-клуб · 3 филиала</p>
    </aside>
  );
}
