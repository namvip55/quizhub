import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Clock, Loader2, AlertTriangle } from "lucide-react";
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
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

type AttemptRow = Database["public"]["Tables"]["exam_attempts"]["Row"];
type ExamRow = Database["public"]["Tables"]["exams"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

export const Route = createFileRoute("/exam/$attemptId")({
  head: () => ({ meta: [{ title: "Đang làm bài thi — QuizHub" }] }),
  component: () => <GlobalErrorBoundary><ExamPage /></GlobalErrorBoundary>,
});

function formatTime(seconds: number) {
  if (seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
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
      className={`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1 rounded-md transition-colors ${
        isTimeCritical ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted"
      }`}
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
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm" id={`q-${index}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {index + 1}
        </div>
        <div className="flex-1 space-y-6">
          <div className="prose prose-sm dark:prose-invert max-w-none font-medium text-base">
            <div dangerouslySetInnerHTML={{ __html: q.content }} />
          </div>
          <div className="flex flex-col space-y-3">
            {options.map((opt, optIdx) => (
              <label
                key={optIdx}
                className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                  selected === optIdx
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${q.id}`}
                  value={optIdx}
                  checked={selected === optIdx}
                  onChange={() => onSelect(q.id, optIdx)}
                  className="h-5 w-5 shrink-0 text-primary focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={`Option ${String.fromCharCode(65 + optIdx)}`}
                />
                <span className="text-sm sm:text-base leading-relaxed break-words flex-1">
                  <div dangerouslySetInnerHTML={{ __html: opt }} />
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ExamPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();

  // Guard: reject non-UUID attemptIds early (e.g. exam codes like "DEMO01")
  if (!UUID_RE.test(attemptId)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div>
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Liên kết không hợp lệ</h2>
          <p className="text-muted-foreground mb-4">
            Đây không phải URL bài thi hợp lệ.<br />
            Nếu bạn có mã bài thi, hãy nhập ở trang chủ.
          </p>
          <Button onClick={() => navigate({ to: "/" })}>Nhập mã bài thi</Button>
        </div>
      </div>
    );
  }

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
    const saved = localStorage.getItem(`exam_${attemptId}_answers`);
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
      localStorage.setItem(`exam_${attemptId}_answers`, JSON.stringify(next));
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
      localStorage.removeItem(`exam_${attemptId}_answers`);
      toast.success("Đã nộp bài thành công!");
      navigate({ to: "/result/$attemptId", params: { attemptId }, replace: true });
    },
    onError: (error) => {
      toast.error(error.message || "Nộp bài thất bại");
    },
  });

  const handleAutoSubmit = useCallback(() => {
    if (submitMutation.isPending || submitMutation.isSuccess) return;
    toast.error("Hết giờ! Đang tự động nộp bài...");
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
          <h2 className="text-xl font-bold mb-2">Không tải được bài thi</h2>
          <p className="text-muted-foreground mb-4">Bạn có thể đã nộp bài trước đó hoặc mạng bị lỗi.</p>
          <Button onClick={() => navigate({ to: "/" })}>Quay lại trang chủ</Button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questionsData.length;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto max-w-4xl px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden shrink-0"
              onClick={() => {
                if (confirm("Bạn có chắc muốn thoát? Tiến trình làm bài sẽ không được lưu.")) {
                  navigate({ to: "/student" });
                }
              }}
            >
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </Button>
            <div className="font-semibold truncate">{attempt.exams.title}</div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium bg-primary/10 px-3 py-1.5 rounded-md">
              <span className="text-primary font-bold">
                Câu {answeredCount} / {totalQuestions}
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
                  {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Nộp bài"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận nộp bài?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {answeredCount < totalQuestions
                      ? `Bạn còn ${totalQuestions - answeredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp không? `
                      : "Bạn đã trả lời tất cả câu hỏi. "}
                    Bạn không thể thay đổi đáp án sau khi nộp.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={() => submitMutation.mutate(answers)} disabled={submitMutation.isPending}>
                    Xác nhận nộp
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex border-destructive/20 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("Bạn có chắc muốn thoát? Tiến trình làm bài sẽ không được lưu.")) {
                  navigate({ to: "/student" });
                }
              }}
            >
              Thoát
            </Button>
          </div>
        </div>
        <div className="h-1 bg-muted w-full">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
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
            Lên đầu trang
          </Button>
        </div>
      </main>
    </div>
  );
}
