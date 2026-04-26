import fs from "fs";
import path from "path";

const files = {};

files["src/routes/exam.$attemptId.tsx"] =
  `import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Clock, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/exam/$attemptId")({
  head: () => ({ meta: [{ title: "Exam in Progress — QuizHub" }] }),
  component: ExamPage,
});

function formatTime(seconds: number) {
  if (seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return \`\${m}:\${s}\`;
}

function ExamPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: attempt, isLoading, error } = useQuery({
    queryKey: ["exam-attempt", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select("*, exams(*)")
        .eq("id", attemptId)
        .single();
      if (error) throw error;
      if (data.is_finished) {
        navigate({ to: "/result/$attemptId", params: { attemptId } });
      }
      return data;
    },
    retry: false,
  });

  const { data: questionsData } = useQuery({
    queryKey: ["exam-questions", attempt?.exam_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_questions")
        .select("order_index, questions(*)")
        .eq("exam_id", attempt!.exam_id)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!attempt && !attempt.is_finished,
  });

  useEffect(() => {
    if (!attempt || attempt.is_finished) return;

    // Load saved answers from local storage
    const saved = localStorage.getItem(\`exam_\${attemptId}_answers\`);
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
      } catch (e) {}
    }

    const durationSeconds = attempt.exams.duration * 60;
    const startedAt = new Date(attempt.started_at).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startedAt) / 1000);
      const remaining = durationSeconds - elapsed;
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (!isSubmitting) {
          handleAutoSubmit();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt, attemptId]);

  const handleSelectAnswer = (qId: string, idx: number) => {
    setAnswers(prev => {
      const next = { ...prev, [qId]: idx };
      localStorage.setItem(\`exam_\${attemptId}_answers\`, JSON.stringify(next));
      return next;
    });
  };

  const submitMutation = useMutation({
    mutationFn: async (currentAnswers: Record<string, number>) => {
      setIsSubmitting(true);
      // Calculate score
      let correctCount = 0;
      if (questionsData) {
        questionsData.forEach((qItem: any) => {
          const q = qItem.questions;
          if (currentAnswers[q.id] === q.correct_answer) {
            correctCount++;
          }
        });
      }
      
      const score = questionsData && questionsData.length > 0 
        ? (correctCount / questionsData.length) * 10 
        : 0;

      const { error } = await supabase.from("exam_attempts").update({
        answers: currentAnswers,
        score,
        is_finished: true,
        submitted_at: new Date().toISOString(),
      }).eq("id", attemptId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      localStorage.removeItem(\`exam_\${attemptId}_answers\`);
      toast.success("Exam submitted successfully!");
      navigate({ to: "/result/$attemptId", params: { attemptId } });
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    }
  });

  const handleAutoSubmit = () => {
    if (isSubmitting) return;
    toast.error("Time's up! Submitting automatically...");
    // use functional state update trick to get latest answers if it was out of sync
    setAnswers(latest => {
      submitMutation.mutate(latest);
      return latest;
    });
  };

  const handleManualSubmit = () => {
    submitMutation.mutate(answers);
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-t-primary" /></div>;
  if (error || !attempt || !questionsData) return null; // Error handled by query / auth guard or redirect

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questionsData.length;
  const isTimeCritical = timeLeft !== null && timeLeft < 60;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto max-w-4xl px-4 h-16 flex items-center justify-between">
          <div className="font-semibold truncate mr-4">
            {attempt.exams.title}
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
              <span className="text-muted-foreground">Answered:</span>
              <span className={answeredCount === totalQuestions ? "text-green-500" : ""}>
                {answeredCount} / {totalQuestions}
              </span>
            </div>
            
            <div className={\`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1 rounded-md \${isTimeCritical ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-muted'}\`}>
              <Clock className="h-4 w-4" />
              {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSubmitting}>Submit</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {answeredCount < totalQuestions 
                      ? \`You have \${totalQuestions - answeredCount} unanswered questions. Are you sure you want to submit? \`
                      : "You have answered all questions. "}
                    You cannot change your answers after submitting.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleManualSubmit} disabled={isSubmitting}>
                    Yes, Submit Now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted w-full">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: \`\${(answeredCount / totalQuestions) * 100}%\` }}
          />
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        {questionsData.map((qItem: any, index: number) => {
          const q = qItem.questions;
          const options = q.options as string[];
          const selected = answers[q.id];

          return (
            <div key={q.id} className="rounded-xl border bg-card p-6 shadow-sm" id={\`q-\${index}\`}>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none font-medium text-base">
                    <ReactMarkdown>{q.content}</ReactMarkdown>
                  </div>
                  <div className="space-y-3">
                    {options.map((opt, optIdx) => (
                      <label 
                        key={optIdx} 
                        className={\`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors \${selected === optIdx ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'}\`}
                      >
                        <input
                          type="radio"
                          name={\`question-\${q.id}\`}
                          value={optIdx}
                          checked={selected === optIdx}
                          onChange={() => handleSelectAnswer(q.id, optIdx)}
                          className="mt-1 h-4 w-4 shrink-0 text-primary focus:ring-primary"
                        />
                        <span className="text-sm leading-relaxed">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-8 pb-4 flex justify-center">
          <Button size="lg" className="w-full sm:w-auto px-12" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to Top
          </Button>
        </div>
      </main>
    </div>
  );
}
`;

files["src/routes/result.$attemptId.tsx"] =
  `import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Award, Home, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/result/$attemptId")({
  head: () => ({ meta: [{ title: "Exam Result — QuizHub" }] }),
  component: ResultPage,
});

function ResultPage() {
  const { attemptId } = Route.useParams();

  const { data: result, isLoading } = useQuery({
    queryKey: ["exam-result", attemptId],
    queryFn: async () => {
      const { data: attempt, error } = await supabase
        .from("exam_attempts")
        .select("*, exams(*)")
        .eq("id", attemptId)
        .single();
      if (error) throw error;

      const { data: questionsData, error: qError } = await supabase
        .from("exam_questions")
        .select("order_index, questions(*)")
        .eq("exam_id", attempt.exam_id)
        .order("order_index");
      if (qError) throw qError;

      const studentAnswers = attempt.answers as Record<string, number>;
      let correctCount = 0;
      
      const details = questionsData.map((eq: any) => {
        const q = eq.questions;
        const studentAns = studentAnswers[q.id];
        const isCorrect = studentAns === q.correct_answer;
        if (isCorrect) correctCount++;
        return { ...q, studentAns, isCorrect, order_index: eq.order_index };
      });

      const started = new Date(attempt.started_at).getTime();
      const submitted = new Date(attempt.submitted_at || attempt.started_at).getTime();
      const timeSpentSec = Math.floor((submitted - started) / 1000);

      return {
        attempt,
        exam: attempt.exams,
        details,
        correctCount,
        totalCount: details.length,
        timeSpentSec,
      };
    },
  });

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-t-primary" /></div>;
  if (!result) return null;

  const { attempt, exam, details, correctCount, totalCount, timeSpentSec } = result;
  const score = attempt.score || 0;
  const percent = Math.round((correctCount / totalCount) * 100);
  const timeSpentMin = Math.floor(timeSpentSec / 60);
  const timeSpentRem = timeSpentSec % 60;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header summary */}
        <div className="rounded-xl border bg-card p-8 shadow-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Award className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Exam Completed</h1>
          <p className="text-muted-foreground mb-8">You have successfully submitted: <span className="font-medium text-foreground">{exam.title}</span></p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Score</p>
              <p className="text-2xl font-bold text-primary">{score.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Percentage</p>
              <p className="text-2xl font-bold">{percent}%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Correct</p>
              <p className="text-2xl font-bold">{correctCount} <span className="text-sm font-normal text-muted-foreground">/ {totalCount}</span></p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
              <p className="text-2xl font-bold">{timeSpentMin}m {timeSpentRem}s</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/enter"><RefreshCw className="mr-2 h-4 w-4" /> Enter Another</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/"><Home className="mr-2 h-4 w-4" /> Back to Home</Link>
            </Button>
          </div>
        </div>

        {/* Detailed answers */}
        {exam.show_answer && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold px-2">Detailed Results</h2>
            {details.map((q: any, i: number) => (
              <div key={q.id} className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 shrink-0">
                    {q.isCorrect ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="font-medium text-sm text-muted-foreground">Question {i + 1}</div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-base">
                      <ReactMarkdown>{q.content}</ReactMarkdown>
                    </div>

                    <div className="space-y-2 pt-2">
                      {(q.options as string[]).map((opt, optIdx) => {
                        const isStudentChoice = q.studentAns === optIdx;
                        const isCorrectChoice = q.correct_answer === optIdx;
                        
                        let boxClass = "flex items-start space-x-3 rounded-lg border p-3 text-sm transition-colors ";
                        if (isStudentChoice && isCorrectChoice) boxClass += "border-green-500 bg-green-500/10 text-green-800 dark:text-green-300 font-medium ring-1 ring-green-500";
                        else if (isStudentChoice && !isCorrectChoice) boxClass += "border-destructive bg-destructive/10 text-destructive font-medium ring-1 ring-destructive";
                        else if (!isStudentChoice && isCorrectChoice) boxClass += "border-green-500/50 bg-green-500/5 text-green-700 dark:text-green-400 font-medium";
                        else boxClass += "border-border bg-muted/30 text-muted-foreground";

                        return (
                          <div key={optIdx} className={boxClass}>
                            <span className="font-semibold shrink-0 w-6">{String.fromCharCode(65 + optIdx)}.</span>
                            <span className="leading-relaxed">{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    {!q.isCorrect && q.studentAns === undefined && (
                      <div className="text-sm font-medium text-destructive mt-2">You did not answer this question.</div>
                    )}

                    {q.explanation && (
                      <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="text-sm font-semibold text-primary mb-2">Explanation:</div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                          <ReactMarkdown>{q.explanation}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
