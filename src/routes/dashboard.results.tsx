import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/results")({
  head: () => ({ meta: [{ title: "Results — QuizHub" }] }),
  component: ResultsPage,
});

function ResultsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Score distributions and attempt history powered by Recharts.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
        Charts and tables arrive in Phase 3.
      </div>
    </div>
  );
}
