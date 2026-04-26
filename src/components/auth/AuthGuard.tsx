import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function AuthGuard({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: "teacher" | "student";
}) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/" });
      } else if (requireRole && profile?.role !== requireRole) {
        navigate({ to: "/" });
      }
    }
  }, [loading, user, profile, navigate, location.pathname, requireRole]);

  if (loading || !user || (requireRole && profile?.role !== requireRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
