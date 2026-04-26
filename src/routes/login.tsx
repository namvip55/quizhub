import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — QuizHub" },
      { name: "description", content: "Sign in to your QuizHub account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-[var(--shadow-card)]">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)]">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">QuizHub</span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your QuizHub account to continue.
        </p>
        <div className="mt-8 rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
          Authentication will be wired up in Phase 2 with Lovable Cloud.
        </div>
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← Back home
          </Link>
          <Button asChild variant="link" className="px-0">
            <Link to="/register">Create account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
