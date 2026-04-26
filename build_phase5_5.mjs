import fs from "fs";
import path from "path";

const files = {};

// 1. Secure Anonymous Token using JSONB
files["src/routes/lobby.$examCode.tsx"] =
  `import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Clock, FileText, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/lobby/$examCode")({
  head: () => ({ meta: [{ title: "Exam Lobby — QuizHub" }] }),
  component: LobbyPage,
});

function LobbyPage() {
  const { examCode } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [studentName, setStudentName] = useState(profile?.full_name || "");

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ["exam-lobby", examCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*, exam_questions(count)")
        .eq("exam_code", examCode)
        .eq("published", true)
        .single();
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!exam) throw new Error("Exam not found");
      
      const isAnon = !user;
      const anonSecret = isAnon ? crypto.randomUUID() : null;
      
      const { data, error } = await supabase.from("exam_attempts").insert({
        exam_id: exam.id,
        student_id: user?.id || null,
        student_name: studentName,
        is_finished: false,
        answers: isAnon ? { _secret: anonSecret } : {},
        started_at: new Date().toISOString(),
      }).select("id").single();
      
      if (error) throw error;
      
      if (isAnon && anonSecret) {
        localStorage.setItem(\`anon_secret_\${data.id}\`, anonSecret);
      }
      
      return data;
    },
    onSuccess: (data) => {
      navigate({ to: "/exam/$attemptId", params: { attemptId: data.id } });
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Skeleton className="w-full max-w-lg h-[400px] rounded-xl" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Exam Not Found</h1>
        <p className="text-muted-foreground mb-8">The exam code might be invalid or the exam is no longer published.</p>
        <Button onClick={() => navigate({ to: "/enter" })}>Return</Button>
      </div>
    );
  }

  const questionCount = exam.exam_questions?.[0]?.count || 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{exam.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please review the details below before starting.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Duration</p>
              <p className="text-2xl font-bold">{exam.duration} <span className="text-sm font-normal text-muted-foreground">min</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Questions</p>
              <p className="text-2xl font-bold">{questionCount}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h3 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Exam Rules</h3>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
            <li>Timer cannot be paused once started.</li>
            <li>The exam will automatically submit when time expires.</li>
            <li>Make sure you have a stable internet connection.</li>
            {exam.allow_retry ? (
              <li>You can attempt this exam up to {exam.max_attempts} times.</li>
            ) : (
              <li>This exam can only be taken once.</li>
            )}
          </ul>
        </div>

        <div className="space-y-6 border-t pt-6">
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
          )}
          
          <Button 
            className="w-full h-11 text-lg" 
            onClick={() => startMutation.mutate()} 
            disabled={(!user && !studentName.trim()) || startMutation.isPending}
          >
            {startMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {startMutation.isPending ? "Starting..." : "Start Exam Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
`;

files["src/routes/result.$attemptId.tsx"] =
  `import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/result/$attemptId")({
  head: () => ({ meta: [{ title: "Exam Result — QuizHub" }] }),
  component: () => (
    <GlobalErrorBoundary>
      <ResultPage />
    </GlobalErrorBoundary>
  ),
});

function ResultPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: attempt, isLoading, error } = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select("*, exams(title)")
        .eq("id", attemptId)
        .single();
        
      if (error) throw error;
      
      // Secure Anonymous Verification
      if (!user) {
        const localSecret = localStorage.getItem(\`anon_secret_\${attemptId}\`);
        const dbSecret = (data.answers as any)?._secret;
        if (!dbSecret || localSecret !== dbSecret) {
          throw new Error("Unauthorized to view this result. Invalid or missing secret token.");
        }
      }

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

// 2. Global Error Boundary
files["src/components/GlobalErrorBoundary.tsx"] = `import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-background">
          <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
          <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            An unexpected error occurred. We have logged this issue.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Reload Page
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go Home
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-muted text-left text-xs rounded-md w-full max-w-2xl overflow-auto">
              {this.state.error?.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
`;

// 3. Invalidate queries properly in dashboard.exams.tsx
files["src/routes/dashboard.exams.tsx"] = fs
  .readFileSync("src/routes/dashboard.exams.tsx", "utf-8")
  .replace(
    'queryClient.invalidateQueries({ queryKey: ["exams"] });',
    'queryClient.invalidateQueries({ queryKey: ["exams"] });\n      queryClient.invalidateQueries({ queryKey: ["exams-list"] });',
  )
  .replace(
    'queryClient.invalidateQueries({ queryKey: ["exams"] });',
    'queryClient.invalidateQueries({ queryKey: ["exams"] });\n      queryClient.invalidateQueries({ queryKey: ["exams-list"] });',
  );

// Add ErrorBoundary to Dashboard
files["src/routes/dashboard.tsx"] = fs
  .readFileSync("src/routes/dashboard.tsx", "utf-8")
  .replace(
    'import { useAuth } from "@/lib/auth";',
    'import { useAuth } from "@/lib/auth";\nimport { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";',
  )
  .replace(
    "<DashboardShell />",
    "<GlobalErrorBoundary>\n        <DashboardShell />\n      </GlobalErrorBoundary>",
  );

// Add ErrorBoundary to Exam
files["src/routes/exam.$attemptId.tsx"] = fs
  .readFileSync("src/routes/exam.$attemptId.tsx", "utf-8")
  .replace(
    'import type { Database } from "@/integrations/supabase/types";',
    'import type { Database } from "@/integrations/supabase/types";\nimport { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";',
  )
  .replace(
    "component: ExamPage,",
    "component: () => <GlobalErrorBoundary><ExamPage /></GlobalErrorBoundary>,",
  );

Object.keys(files).forEach((file) => {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, files[file]);
  console.log("Created/Updated:", file);
});
