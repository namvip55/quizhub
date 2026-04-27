import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import { sanitizeHtml } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { getAnonSecret } from "@/lib/utils";

export const Route = createFileRoute("/result/$attemptId")({
  head: () => ({ meta: [{ title: "Kết quả thi — QuizHub" }] }),
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

  const {
    data: attempt,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_exam_attempt", {
          attempt_id: attemptId,
          secret: getAnonSecret(attemptId),
        })
        .select("*, exams(title)")
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
        <h1 className="text-2xl font-bold mb-2">Không tải được kết quả</h1>
        <p className="text-muted-foreground mb-8">
          {error?.message || "Không tìm thấy kết quả hoặc bạn không có quyền xem."}
        </p>
        <Button onClick={() => navigate({ to: "/" })}>Quay lại trang chủ</Button>
      </div>
    );
  }

  const score = attempt.score || 0;
  const isPass = score >= 5;

  const startedAt = attempt.started_at ? new Date(attempt.started_at).getTime() : 0;
  const submittedAt = attempt.submitted_at ? new Date(attempt.submitted_at).getTime() : 0;
  const timeSpentSeconds =
    startedAt && submittedAt ? Math.floor((submittedAt - startedAt) / 1000) : 0;
  const timeSpentMins = Math.floor(timeSpentSeconds / 60);
  const timeSpentSecs = timeSpentSeconds % 60;

  const answers = (attempt.answers as Record<string, number>) || {};

  return (
    <div className="min-h-screen bg-muted/20 pb-20 pt-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to={user ? "/dashboard" : "/"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {user ? "Quay lại bảng điều khiển" : "Quay lại trang chủ"}
          </Link>
        </Button>

        <div className="rounded-xl border bg-card p-6 sm:p-10 text-center shadow-sm relative overflow-hidden">
          <div
            className={`absolute top-0 left-0 w-full h-2 ${isPass ? "bg-green-500" : "bg-destructive"}`}
          />
          <h1 className="text-3xl font-bold tracking-tight mb-2">{attempt.exams?.title}</h1>
          <p className="text-muted-foreground mb-8">Đã hoàn thành bởi {attempt.student_name}</p>

          <div className="flex justify-center mb-8">
            <div
              className={`flex h-32 w-32 flex-col items-center justify-center rounded-full border-8 ${isPass ? "border-green-500 text-green-600" : "border-destructive text-destructive"}`}
            >
              <span className="text-4xl font-black">{score.toFixed(1)}</span>
              <span className="text-sm font-semibold">/ 10</span>
            </div>
          </div>

          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="font-semibold">{timeSpentMins}</span>m{" "}
                <span className="font-semibold">{timeSpentSecs}</span>s
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Xem lại chi tiết</h2>
          {questionsData.map((qItem: any, index: number) => {
            const q = qItem.questions;
            const studentAns = answers[q.id];
            const isCorrect = studentAns === q.correct_answer;
            const options = q.options as string[];

            return (
              <div
                key={q.id}
                className={`rounded-xl border bg-card p-4 sm:p-6 shadow-sm ${isCorrect ? "border-l-4 border-l-green-500" : "border-l-4 border-l-destructive"}`}
              >
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
                        <strong>Câu {index + 1}: </strong>
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.content) }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {options.map((opt, optIdx) => {
                        const isStudentChoice = studentAns === optIdx;
                        const isActualCorrect = q.correct_answer === optIdx;

                        let ringClass = "border bg-muted/30";
                        if (isActualCorrect) {
                          ringClass =
                            "border-green-500 bg-green-500/10 font-semibold text-green-700 dark:text-green-400";
                        } else if (isStudentChoice && !isCorrect) {
                          ringClass = "border-destructive bg-destructive/10 text-destructive";
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center justify-between rounded-lg p-3 ${ringClass}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold border">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="text-sm">{opt}</span>
                            </div>
                            {isStudentChoice && (
                              <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                                Bạn đã chọn
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-blue-800 dark:text-blue-300 mt-4">
                        <p className="font-semibold mb-1">Giải thích:</p>
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.explanation) }} />
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
