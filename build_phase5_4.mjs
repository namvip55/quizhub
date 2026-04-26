import fs from "fs";
import path from "path";

const files = {};

files[".env.example"] = `VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
`;

files["wrangler.toml"] = `name = "quizhub"
compatibility_date = "2024-04-05"
pages_build_output_dir = "dist"

# Do not put your VITE_SUPABASE_PUBLISHABLE_KEY here if the repo is public.
# Instead, go to Cloudflare Dashboard > Pages > quizhub > Settings > Environment variables
# and add the following Production and Preview variables:
# VITE_SUPABASE_URL = "https://your-project-id.supabase.co"
# VITE_SUPABASE_PROJECT_ID = "your-project-id"
# VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_your_key_here"

[vars]
# You can put non-sensitive public variables here if needed.
`;

files["supabase_update_rls.sql"] =
  `-- Run this in your Supabase SQL Editor to allow anonymous users to view their results
-- Since attempt IDs are UUIDv4, guessing another anonymous user's attempt is practically impossible.

DROP POLICY IF EXISTS "Students can view their own attempts" ON public.exam_attempts;

CREATE POLICY "Students can view their own attempts or anonymous"
ON public.exam_attempts FOR SELECT
USING (student_id = auth.uid() OR student_id IS NULL);
`;

files["src/routes/result.$attemptId.tsx"] =
  `import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowLeft, Clock, AlertTriangle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/result/$attemptId")({
  head: () => ({ meta: [{ title: "Exam Result — QuizHub" }] }),
  component: ResultPage,
});

function ResultPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: attempt, isLoading, error } = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: async () => {
      // Allow if logged in OR if anonymous token exists
      const isAnon = localStorage.getItem(\`anon_token_\${attemptId}\`);
      if (!user && !isAnon) {
        throw new Error("Unauthorized to view this result");
      }

      const { data, error } = await supabase
        .from("exam_attempts")
        .select("*, exams(title)")
        .eq("id", attemptId)
        .single();
        
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  const { data: questionsData, isLoading: qLoading } = useQuery({
    queryKey: ["exam-questions-result", attempt?.exam_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_questions")
        .select("order_index, questions(*)")
        .eq("exam_id", attempt!.exam_id)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!attempt,
  });

  if (isLoading || qLoading) {
    return (
      <div className="min-h-screen bg-muted/20 p-4 sm:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !attempt || !questionsData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Could not load result</h1>
        <p className="text-muted-foreground mb-8">
          {error?.message || "Result not found or you don't have permission to view it."}
        </p>
        <Button onClick={() => navigate({ to: "/enter" })}>Return Home</Button>
      </div>
    );
  }

  const score = attempt.score || 0;
  const isPass = score >= 5;

  const startedAt = attempt.started_at ? new Date(attempt.started_at).getTime() : 0;
  const submittedAt = attempt.submitted_at ? new Date(attempt.submitted_at).getTime() : 0;
  const timeSpentSeconds = startedAt && submittedAt ? Math.floor((submittedAt - startedAt) / 1000) : 0;
  const timeSpentMins = Math.floor(timeSpentSeconds / 60);
  const timeSpentSecs = timeSpentSeconds % 60;

  const answers = (attempt.answers as Record<string, number>) || {};

  return (
    <div className="min-h-screen bg-muted/20 pb-20 pt-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to={user ? "/dashboard" : "/enter"}>
            <ArrowLeft className="mr-2 h-4 w-4" /> 
            {user ? "Back to Dashboard" : "Return Home"}
          </Link>
        </Button>

        <div className="rounded-xl border bg-card p-6 sm:p-10 text-center shadow-sm relative overflow-hidden">
          <div className={\`absolute top-0 left-0 w-full h-2 \${isPass ? "bg-green-500" : "bg-destructive"}\`} />
          <h1 className="text-3xl font-bold tracking-tight mb-2">{attempt.exams?.title}</h1>
          <p className="text-muted-foreground mb-8">Completed by {attempt.student_name}</p>

          <div className="flex justify-center mb-8">
            <div className={\`flex h-32 w-32 flex-col items-center justify-center rounded-full border-8 \${isPass ? "border-green-500 text-green-600" : "border-destructive text-destructive"}\`}>
              <span className="text-4xl font-black">{score.toFixed(1)}</span>
              <span className="text-sm font-semibold">/ 10</span>
            </div>
          </div>

          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-semibold">{timeSpentMins}</span>m <span className="font-semibold">{timeSpentSecs}</span>s
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Detailed Review</h2>
          {questionsData.map((qItem: any, index: number) => {
            const q = qItem.questions;
            const studentAns = answers[q.id];
            const isCorrect = studentAns === q.correct_answer;
            const options = q.options as string[];

            return (
              <div key={q.id} className={\`rounded-xl border bg-card p-4 sm:p-6 shadow-sm \${isCorrect ? "border-l-4 border-l-green-500" : "border-l-4 border-l-destructive"}\`}>
                <div className="flex gap-4">
                  <div className="mt-1">
                    {isCorrect ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="prose prose-sm max-w-none dark:prose-invert font-medium">
                        <strong>Question {index + 1}: </strong>
                        <ReactMarkdown>{q.content}</ReactMarkdown>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {options.map((opt, optIdx) => {
                        const isStudentChoice = studentAns === optIdx;
                        const isActualCorrect = q.correct_answer === optIdx;

                        let ringClass = "border bg-muted/30";
                        if (isActualCorrect) {
                          ringClass = "border-green-500 bg-green-500/10 font-semibold text-green-700 dark:text-green-400";
                        } else if (isStudentChoice && !isCorrect) {
                          ringClass = "border-destructive bg-destructive/10 text-destructive";
                        }

                        return (
                          <div key={optIdx} className={\`flex items-center justify-between rounded-lg p-3 \${ringClass}\`}>
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold border">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="text-sm">{opt}</span>
                            </div>
                            {isStudentChoice && <span className="text-xs font-bold uppercase tracking-wider opacity-70">Your Answer</span>}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-blue-800 dark:text-blue-300 mt-4">
                        <p className="font-semibold mb-1">Explanation:</p>
                        <ReactMarkdown>{q.explanation}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
`;

Object.keys(files).forEach((file) => {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, files[file]);
  console.log("Created:", file);
});
