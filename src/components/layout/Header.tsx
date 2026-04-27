import { Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function Header() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Đăng xuất thành công");
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-elegant)]">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">QuizHub</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground mr-2 hidden sm:inline-block">
                Xin chào, {profile?.full_name || user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate({ to: profile?.role === "teacher" ? "/dashboard/subjects" : "/student" })
                }
              >
                Bảng điều khiển
              </Button>
              <Link to="/about" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Thông tin
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <Link to="/about" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Thông tin
              </Link>
              <Link to="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Đăng nhập
              </Link>
              <Button size="sm" onClick={() => navigate({ to: "/register" })}>
                Bắt đầu
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
