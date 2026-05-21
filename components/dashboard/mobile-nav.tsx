"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Menu, Package, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

interface MobileNavProps {
  showBranches?: boolean;
}

export function MobileNav({ showBranches = false }: MobileNavProps) {
  const pathname = usePathname();
  const navItems = showBranches ? [...baseNavItems, ownerNavItem] : baseNavItems;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden" aria-label="Меню">
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            StaffEfficiency
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
