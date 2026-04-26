import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({
        to: "/login",
        search: { redirect: location.pathname },
      });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
