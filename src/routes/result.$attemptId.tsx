import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/result/$attemptId")({
  head: () => ({ meta: [{ title: "Result — QuizHub" }] }),
  component: ResultPage,
});

function ResultPage() {
  const { attemptId } = Route.useParams();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Attempt</p>
        <h1 className="mt-2 font-mono text-xl font-semibold">{attemptId}</h1>
        <p className="mt-6 text-sm text-muted-foreground">
          Result view (score + answer review) is implemented in Phase 4.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
