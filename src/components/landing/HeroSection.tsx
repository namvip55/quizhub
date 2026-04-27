import { Sparkles } from "lucide-react";
import { JoinExamForm } from "./JoinExamForm";

export function HeroSection() {
  return (
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
          QuizHub cung cấp cho giáo viên ngân hàng câu hỏi đẹp mắt, bài thi có thời gian với mã chia
          sẻ, và phân tích kết quả học sinh ngay lập tức — tất cả trong một bảng điều khiển.
        </p>

        <JoinExamForm />
      </div>
    </section>
  );
}
