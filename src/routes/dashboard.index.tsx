import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ListChecks, FileText, BarChart3, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { user } = useAuth();

  const { data: counts, isLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      if (!user) return { subjects: 0, questions: 0, exams: 0, attempts: 0 };
      
      const [sub, q, ex, att] = await Promise.all([
        supabase.from("subjects").select("*", { count: "exact", head: true }).eq("teacher_id", user.id),
        supabase.from("questions").select("*", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("exams").select("*", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("exam_attempts").select("id", { count: "exact" }) // Needs proper join for teacher if we strictly count their attempts. RLS policy "attempts_teacher_select" already limits to their exams.
      ]);

      return {
        subjects: sub.count || 0,
        questions: q.count || 0,
        exams: ex.count || 0,
        attempts: att.data?.length || 0, // Using data length since count with head:true on RLS might be tricky depending on policies, but RLS policy "attempts_teacher_select" works well with regular select.
      };
    },
    enabled: !!user,
  });

  const stats = [
    { label: "Môn học", value: isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : counts?.subjects, icon: BookOpen, href: "/dashboard/subjects" as const },
    { label: "Câu hỏi", value: isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : counts?.questions, icon: ListChecks, href: "/dashboard/questions" as const },
    { label: "Đề thi", labelPlural: "Đề thi", value: isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : counts?.exams, icon: FileText, href: "/dashboard/exams" as const },
    { label: "Lượt làm bài", value: isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : counts?.attempts, icon: BarChart3, href: "/dashboard/results" as const },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Chào mừng trở lại 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Đây là tổng quan về không gian làm việc QuizHub của bạn.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.href}
            className="group rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)] transition hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold">{s.value}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-8 text-center">
        <h2 className="text-base font-medium">Bắt đầu ngay</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tạo Môn học, thêm Câu hỏi, sau đó xây dựng Đề thi để chia sẻ với học sinh của bạn.
        </p>
      </div>
    </div>
  );
}
