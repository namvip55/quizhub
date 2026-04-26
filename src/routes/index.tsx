import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  GraduationCap,
  BookOpen,
  Timer,
  BarChart3,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")(
  {
    head: () => ({
      meta: [
        { title: "QuizHub — Tạo Đề Thi Trực Tuyến Trong Vài Phút" },
        {
          name: "description",
          content:
            "QuizHub giúp giáo viên xây dựng ngân hàng câu hỏi, mở đề thi hẹn giờ với mã bảo mật và xem ngay kết quả của học sinh.",
        },
      ],
    }),
    component: LandingPage,
  },
);

function LandingPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const { user, profile, signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
    toast.success("Đăng xuất thành công");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Mã bài thi phải gồm 6 ký tự");
      return;
    }

    setLoading(true);
    try {
      const { data: exam, error } = await supabase
        .from("exams")
        .select("*")
        .eq("exam_code", code.toUpperCase())
        .single();

      if (error || !exam) {
        toast.error("Mã bài thi không hợp lệ hoặc bài thi hiện không mở.");
        setLoading(false);
        return;
      }

      navigate({ to: "/lobby/$examCode", params: { examCode: code.toUpperCase() } });
    } catch (err: any) {
      toast.error(err.message || "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-elegant)]">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">QuizHub</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground mr-2 hidden sm:inline-block">
                  Xin chào, {profile?.full_name || user.email}
                </span>
                <button
                  type="button"
                  onClick={() => navigate({ to: profile?.role === "teacher" ? "/dashboard/subjects" : "/student" })}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Bảng điều khiển
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/about" })}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Thông tin
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/about"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Thông tin
                </Link>
                <Link
                  to="/login"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Đăng nhập
                </Link>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/register" })}
                  className={buttonVariants({ size: "sm" })}
                >
                  Bắt đầu
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero + Enter Code ── */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-40"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 30%, transparent), transparent)",
            }}
          />
          <div className="container mx-auto px-4 py-20 text-center sm:py-28">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Nền tảng thi trực tuyến hiện đại
            </div>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              Tổ chức thi trực tuyến bảo mật,{" "}
              <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                dễ dàng.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              QuizHub cung cấp cho giáo viên ngân hàng câu hỏi đẹp mắt, bài thi có thời gian với mã chia sẻ, và phân tích kết quả học sinh ngay lập tức — tất cả trong một bảng điều khiển.
            </p>

            {/* ── Enter Code Form (merged from /enter) ── */}
            <div className="mx-auto mt-10 w-full max-w-sm">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Input
                  id="exam-code"
                  placeholder="Nhập mã bài thi 6 ký tự"
                  className="text-center text-2xl tracking-widest uppercase h-14 bg-card border-border/60"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? "Đang kiểm tra..." : "Tham gia bài thi"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">
                Không cần tài khoản — chỉ cần nhập mã giáo viên cung cấp.
              </p>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="container mx-auto grid gap-6 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: "Ngân hàng câu hỏi",
              desc: "Hỗ trợ Markdown, 4 lựa chọn đáp án, và giải thích chi tiết.",
            },
            {
              icon: Timer,
              title: "Bài thi hẹn giờ",
              desc: "Tự động nộp khi hết giờ, làm từng câu hoặc cuộn, có luật làm lại.",
            },
            {
              icon: ShieldCheck,
              title: "Bảo mật tuyệt đối",
              desc: "Row-Level Security giữ dữ liệu của mỗi người dùng hoàn toàn độc lập.",
            },
            {
              icon: BarChart3,
              title: "Phân tích trực tiếp",
              desc: "Phân bố điểm số, lịch sử làm bài và hiệu suất của từng đề thi.",
            },
            {
              icon: GraduationCap,
              title: "Thân thiện với học sinh",
              desc: "Tham gia với mã 6 ký tự — không bắt buộc đăng ký tài khoản.",
            },
            {
              icon: Sparkles,
              title: "Nhanh & đẹp mắt",
              desc: "Bảng điều khiển cao cấp xây dựng bằng React 19, Tailwind và Shadcn UI.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)] transition hover:border-primary/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} QuizHub. Đã đăng ký bản quyền.</p>
          <p>Xây dựng với React 19 · TanStack · Tailwind</p>
        </div>
      </footer>
    </div>
  );
}
