import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeatureGrid } from "@/components/landing/FeatureGrid";

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
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeatureGrid />
      </main>
      <Footer />
    </div>
  );
}
