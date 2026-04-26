import { 
  BookOpen, 
  Timer, 
  ShieldCheck, 
  BarChart3, 
  GraduationCap, 
  Sparkles 
} from "lucide-react";

const FEATURES = [
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
];

export function FeatureGrid() {
  return (
    <section className="container mx-auto grid gap-6 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f) => (
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
  );
}
