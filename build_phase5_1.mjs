import fs from "fs";
import path from "path";

const files = {};

files["src/components/dashboard/AppSidebar.tsx"] = `import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  FileText,
  BarChart3,
  GraduationCap,
} from "lucide-react";

const items = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard, exact: true },
  { title: "Subjects", url: "/dashboard/subjects", icon: BookOpen },
  { title: "Questions", url: "/dashboard/questions", icon: ListChecks },
  { title: "Import DOCX", url: "/dashboard/import", icon: FileText },
  { title: "Exams", url: "/dashboard/exams", icon: FileText },
  { title: "Results", url: "/dashboard/results", icon: BarChart3 },
] as const;

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (url: string, exact?: boolean) =>
    exact ? location.pathname === url : location.pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" onClick={() => setOpenMobile(false)} className="flex items-center gap-2 px-2 py-1.5 focus-visible:ring-2 focus-visible:ring-primary rounded-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)]">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-sm font-semibold tracking-tight">QuizHub</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url, "exact" in item ? item.exact : false);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} onClick={() => setOpenMobile(false)} aria-label={item.title}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
`;

files["src/routes/exam.$attemptId.tsx"] =
  `import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Clock, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { Database } from "@/integrations/supabase/types";

type AttemptRow = Database["public"]["Tables"]["exam_attempts"]["Row"];
type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

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

// Extracted Timer component to prevent global re-renders
const TimerDisplay = memo(function TimerDisplay({
  durationMinutes,
  startedAtIso,
  onTimeUp,
}: {
  durationMinutes: number;
  startedAtIso: string;
  onTimeUp: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const durationSeconds = durationMinutes * 60;
    const startedAt = new Date(startedAtIso).getTime();
    
    let isFinished = false;

    const interval = setInterval(() => {
      if (isFinished) return;
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startedAt) / 1000);
      const remaining = durationSeconds - elapsed;
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        isFinished = true;
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [durationMinutes, startedAtIso, onTimeUp]);

  const isTimeCritical = timeLeft !== null && timeLeft < 60;

  return (
    <div
      className={\`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1 rounded-md transition-colors \${
        isTimeCritical ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted"
      }\`}
      aria-live="polite"
    >
      <Clock className="h-4 w-4" />
      {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
    </div>
  );
});

// Extracted Question component wrapped in React.memo
const QuestionItem = memo(function QuestionItem({
  q,
  index,
  selected,
  onSelect,
}: {
  q: QuestionRow;
  index: number;
  selected: number | undefined;
  onSelect: (qId: string, idx: number) => void;
}) {
  const options = q.options as string[];
  
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm" id={\`q-\${index}\`}>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {index + 1}
        </div>
        <div className="flex-1 space-y-6">
          <div className="prose prose-sm dark:prose-invert max-w-none font-medium text-base">
            <ReactMarkdown>{q.content}</ReactMarkdown>
          </div>
          <div className="flex flex-col space-y-3">
            {options.map((opt, optIdx) => (
              <label
                key={optIdx}
                className={\`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors \${
                  selected === optIdx
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted/50"
                }\`}
              >
                <input
                  type="radio"
                  name={\`question-\${q.id}\`}
                  value={optIdx}
                  checked={selected === optIdx}
                  onChange={() => onSelect(q.id, optIdx)}
                  className="h-5 w-5 shrink-0 text-primary focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={\`Option \${String.fromCharCode(65 + optIdx)}\`}
                />
                <span className="text-sm sm:text-base leading-relaxed break-words flex-1">
                  {opt}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

function ExamPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<string, number>>({});

  const { data: attempt, isLoading: attemptLoading, error } = useQuery({
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
      return data as AttemptRow & { exams: ExamRow };
    },
    retry: false,
    staleTime: 1000 * 60, // 1 min
  });

  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: ["exam-questions", attempt?.exam_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_questions")
        .select("order_index, questions(*)")
        .eq("exam_id", attempt!.exam_id)
        .order("order_index");
      if (error) throw error;
      return data as unknown as { order_index: number; questions: QuestionRow }[];
    },
    enabled: !!attempt && !attempt.is_finished,
    staleTime: 1000 * 60 * 60, // questions rarely change during exam
  });

  useEffect(() => {
    if (!attempt || attempt.is_finished) return;
    const saved = localStorage.getItem(\`exam_\${attemptId}_answers\`);
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
      } catch (e) {
        // Ignored
      }
    }
  }, [attempt, attemptId]);

  const handleSelectAnswer = useCallback((qId: string, idx: number) => {
    setAnswers((prev) => {
      const next = { ...prev, [qId]: idx };
      localStorage.setItem(\`exam_\${attemptId}_answers\`, JSON.stringify(next));
      return next;
    });
  }, [attemptId]);

  const submitMutation = useMutation({
    mutationFn: async (currentAnswers: Record<string, number>) => {
      let correctCount = 0;
      if (questionsData) {
        questionsData.forEach((qItem) => {
          const q = qItem.questions;
          if (currentAnswers[q.id] === q.correct_answer) {
            correctCount++;
          }
        });
      }

      const score =
        questionsData && questionsData.length > 0 ? (correctCount / questionsData.length) * 10 : 0;

      const { error } = await supabase
        .from("exam_attempts")
        .update({
          answers: currentAnswers,
          score,
          is_finished: true,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", attemptId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      localStorage.removeItem(\`exam_\${attemptId}_answers\`);
      toast.success("Exam submitted successfully!");
      navigate({ to: "/result/$attemptId", params: { attemptId }, replace: true });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit exam");
    },
  });

  const handleAutoSubmit = useCallback(() => {
    if (submitMutation.isPending || submitMutation.isSuccess) return;
    toast.error("Time's up! Submitting automatically...");
    setAnswers((latest) => {
      submitMutation.mutate(latest);
      return latest;
    });
  }, [submitMutation]);

  if (attemptLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-muted/20 pb-20">
        <header className="sticky top-0 z-50 border-b bg-background h-16 flex items-center px-4 shadow-sm">
          <Skeleton className="h-6 w-1/3" />
        </header>
        <main className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </main>
      </div>
    );
  }

  if (error || !attempt || !questionsData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div>
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to load exam</h2>
          <p className="text-muted-foreground mb-4">You might have already submitted this exam or the network failed.</p>
          <Button onClick={() => navigate({ to: "/enter" })}>Return Home</Button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questionsData.length;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto max-w-4xl px-4 h-16 flex items-center justify-between">
          <div className="font-semibold truncate mr-4">{attempt.exams.title}</div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
              <span className="text-muted-foreground">Answered:</span>
              <span className={answeredCount === totalQuestions ? "text-green-500" : ""}>
                {answeredCount} / {totalQuestions}
              </span>
            </div>

            <TimerDisplay 
              durationMinutes={attempt.exams.duration} 
              startedAtIso={attempt.started_at} 
              onTimeUp={handleAutoSubmit} 
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={submitMutation.isPending} size="sm" className="sm:text-base">
                  {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                </Button>
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
                  <AlertDialogAction onClick={() => submitMutation.mutate(answers)} disabled={submitMutation.isPending}>
                    Yes, Submit Now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="h-1 bg-muted w-full">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: \`\${(answeredCount / totalQuestions) * 100}%\` }}
          />
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        {questionsData.map((qItem, index) => (
          <QuestionItem
            key={qItem.questions.id}
            q={qItem.questions}
            index={index}
            selected={answers[qItem.questions.id]}
            onSelect={handleSelectAnswer}
          />
        ))}

        <div className="pt-8 pb-4 flex justify-center">
          <Button
            size="lg"
            variant="secondary"
            className="w-full sm:w-auto px-12"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Back to Top
          </Button>
        </div>
      </main>
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
