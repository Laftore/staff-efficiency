import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { getSessionUser } from "@/lib/auth/session";
import { canManageBranches } from "@/lib/auth/roles";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const showBranches = user ? canManageBranches(user.role) : false;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">
        <AppSidebar showBranches={showBranches} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 md:hidden">
          <MobileNav showBranches={showBranches} />
          <span className="text-sm font-semibold">StaffEfficiency</span>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
