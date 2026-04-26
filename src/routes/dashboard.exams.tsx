import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard/exams")({
  head: () => ({ meta: [{ title: "Exams — QuizHub" }] }),
  component: ExamsPage,
});

function ExamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compose exams from your bank and share a unique code.
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" /> New exam
        </Button>
      </div>
      <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
        Exam composer + code generation arrives in Phase 3.
      </div>
    </div>
  );
}
