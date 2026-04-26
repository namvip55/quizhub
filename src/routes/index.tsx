import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Timer, BarChart3, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuizHub — Run Online Exams in Minutes" },
      {
        name: "description",
        content:
          "QuizHub helps teachers build question banks, launch timed exams with secure codes, and instantly review student results.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-elegant)]">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">QuizHub</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-40"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 30%, transparent), transparent)",
            }}
          />
          <div className="container mx-auto px-4 py-24 text-center sm:py-32">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Modern online exam platform
            </div>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              Run secure online exams,{" "}
              <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                effortlessly.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              QuizHub gives teachers a beautiful question bank, timed exams with shareable codes,
              and instant student analytics — all in one dashboard.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/register">Create free account</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/exam/$code" params={{ code: "DEMO01" }}>
                  Take an exam with a code
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto grid gap-6 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: "Question banks",
              desc: "Markdown-rich questions, four answer options, optional explanations.",
            },
            {
              icon: Timer,
              title: "Timed exams",
              desc: "Auto-submit on timeout, single-question or scroll mode, retry rules.",
            },
            {
              icon: ShieldCheck,
              title: "Secure by default",
              desc: "Row-Level Security keeps every teacher and student strictly scoped.",
            },
            {
              icon: BarChart3,
              title: "Live analytics",
              desc: "Score distribution, attempt history, and per-exam performance.",
            },
            {
              icon: GraduationCap,
              title: "Student-friendly",
              desc: "Join with a 6-character code — no account required to take an exam.",
            },
            {
              icon: Sparkles,
              title: "Fast & beautiful",
              desc: "A premium dashboard built with React 19, Tailwind, and Shadcn UI.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)] transition hover:border-primary/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} QuizHub. All rights reserved.</p>
          <p>Built with React 19 · TanStack · Tailwind</p>
        </div>
      </footer>
    </div>
  );
}
