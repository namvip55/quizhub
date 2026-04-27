import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  head: () => ({ meta: [{ title: "Phòng chờ thi — QuizHub" }] }),
  component: LobbyPage,
});

function LobbyPage() {
  const { examCode } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [studentName, setStudentName] = useState(profile?.full_name || "");

  const {
    data: exam,
    isLoading,
    error,
  } = useQuery({
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

  const { data: activeAttempt, isLoading: loadingActive } = useQuery({
    queryKey: ["active-attempt", exam?.id],
    queryFn: async () => {
      const isAnon = !user;
      let secret = null;
      if (isAnon) {
        secret = localStorage.getItem("quizhub_anon_session_secret");
        if (!secret) return null;
      }
      const { data, error } = await supabase
        .rpc("get_active_exam_attempt", {
          p_exam_id: exam!.id,
          p_secret: secret,
        })
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!exam,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!exam) throw new Error("Exam not found");

      const isAnon = !user;
      let anonSecret = null;

      if (isAnon) {
        anonSecret = localStorage.getItem("quizhub_anon_session_secret");
        if (!anonSecret) {
          anonSecret = crypto.randomUUID();
          localStorage.setItem("quizhub_anon_session_secret", anonSecret);
        }
      }

      const { data, error } = await supabase
        .rpc("start_attempt", {
          p_exam_id: exam.id,
          p_student_name: studentName,
          p_secret: anonSecret,
        })
        .single();

      if (error) throw error;

      if (isAnon && anonSecret) {
        localStorage.setItem(`anon_secret_${data.id}`, anonSecret);
      }

      return data;
    },
    onSuccess: (data) => {
      navigate({ to: "/exam/$attemptId", params: { attemptId: data.id } });
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading || loadingActive) {
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
        <h1 className="text-2xl font-bold mb-2">Không tìm thấy bài thi</h1>
        <p className="text-muted-foreground mb-8">
          Mã bài thi có thể không hợp lệ hoặc bài thi đã đóng.
        </p>
        <Button onClick={() => navigate({ to: "/" })}>Quay lại</Button>
      </div>
    );
  }

  const questionCount = exam.exam_questions?.[0]?.count || 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{exam.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vui lòng kiểm tra thông tin bín dưới trước khi bắt đầu.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Thời gian</p>
              <p className="text-2xl font-bold">
                {exam.duration}{" "}
                <span className="text-sm font-normal text-muted-foreground">phút</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Số câu hỏi</p>
              <p className="text-2xl font-bold">{questionCount}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Quy tắc thi
          </h3>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
            <li>Không thể tạm dừng đồng hồ sau khi bắt đầu.</li>
            <li>Bài thi sẽ tự động nộp khi hết giờ.</li>
            <li>Đảm bảo bạn có kết nối Internet ổn định.</li>
            {exam.allow_retry ? (
              <li>Bạn có thể làm bài thi này tối đa {exam.max_attempts} lần.</li>
            ) : (
              <li>Bài thi này chỉ được làm một lần.</li>
            )}
          </ul>
        </div>

        <div className="space-y-6 border-t pt-6">
          {activeAttempt ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-sm">
                Bạn đang có một bài thi dang dở chưa nộp. Hãy tiếp tục để hoàn thành.
              </div>
              <Button
                className="w-full h-11 text-lg"
                onClick={() =>
                  navigate({ to: "/exam/$attemptId", params: { attemptId: activeAttempt.id } })
                }
              >
                Tiếp tục bài thi đang làm
              </Button>
            </div>
          ) : (
            <>
              {!user && (
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Họ và tên <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Nhập họ và tên của bạn"
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
                {startMutation.isPending ? "Đang bắt đầu..." : "Bắt đầu làm bài"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
