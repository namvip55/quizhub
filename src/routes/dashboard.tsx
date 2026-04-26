import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, UserCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Bảng điều khiển — QuizHub" },
      { name: "description", content: "Quản lý môn học, câu hỏi, đề thi và kết quả của bạn." },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <AuthGuard requireRole="teacher">
      <GlobalErrorBoundary>
        <DashboardShell />
      </GlobalErrorBoundary>
    </AuthGuard>
  );
}

function DashboardShell() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Đã đăng xuất");
    navigate({ to: "/" });
  };

  const displayName = profile?.full_name || user?.email || "Tài khoản";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex-1" />
            {profile?.role && (
              <span className="hidden rounded-full border border-border/60 bg-card px-2.5 py-0.5 text-xs capitalize text-muted-foreground sm:inline-block">
                {profile.role === "teacher" ? "Giáo viên" : "Học sinh"}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Tài khoản">
                  <UserCircle2 className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
