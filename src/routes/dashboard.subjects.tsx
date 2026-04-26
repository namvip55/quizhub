import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard/subjects")({
  head: () => ({ meta: [{ title: "Subjects — QuizHub" }] }),
  component: SubjectsPage,
});

function SubjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Group your question bank by subject.
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" /> New subject
        </Button>
      </div>
      <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
        Subjects CRUD will be implemented in Phase 3.
      </div>
    </div>
  );
}
