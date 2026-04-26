import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ListChecks, FileText, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

const stats = [
  { label: "Subjects", value: "—", icon: BookOpen, href: "/dashboard/subjects" as const },
  { label: "Questions", value: "—", icon: ListChecks, href: "/dashboard/questions" as const },
  { label: "Exams", value: "—", icon: FileText, href: "/dashboard/exams" as const },
  { label: "Attempts", value: "—", icon: BarChart3, href: "/dashboard/results" as const },
];

function DashboardOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's a snapshot of your QuizHub workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.href}
            className="group rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)] transition hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold">{s.value}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-8 text-center">
        <h2 className="text-base font-medium">Phase 1 ready</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Project scaffold, design system, sidebar, and routing are in place. Phase 2 will connect
          Lovable Cloud and wire up auth.
        </p>
      </div>
    </div>
  );
}
