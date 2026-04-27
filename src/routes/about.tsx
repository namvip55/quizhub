import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Github, Heart, ArrowLeft, Info, Coffee } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-border/40 bg-background/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-between items-center mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
            </Link>
            <Info className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Về QuizHub
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <section className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Mục đích phát triển
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              QuizHub được tạo ra với mục tiêu hỗ trợ việc ôn luyện và thi trắc nghiệm trực tuyến
              một cách đơn giản, hiệu quả và hiện đại nhất. Dự án chủ yếu phục vụ nhu cầu học tập
              <span className="text-foreground font-medium"> cá nhân và bạn bè</span>, giúp việc
              quản lý ngân hàng câu hỏi và làm bài thi trở nên dễ dàng hơn bao giờ hết.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              Thông tin liên hệ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="mailto:namcho376@gmail.com"
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-primary/10 transition-colors border border-border/40 group"
              >
                <div className="p-2 rounded-full bg-background group-hover:scale-110 transition-transform">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                    Email
                  </div>
                  <div className="text-sm font-medium">namcho376@gmail.com</div>
                </div>
              </a>
              <a
                href="https://github.com/namvip55/quizhub"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-primary/10 transition-colors border border-border/40 group"
              >
                <div className="p-2 rounded-full bg-background group-hover:scale-110 transition-transform">
                  <Github className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                    GitHub
                  </div>
                  <div className="text-sm font-medium">github.com/namvip55/quizhub</div>
                </div>
              </a>
            </div>
          </section>

          <section className="space-y-4 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/10">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Coffee className="h-5 w-5 text-amber-500" />
              Ủng hộ nhà phát triển
            </h3>
            <p className="text-sm text-muted-foreground">
              Nếu bạn thấy ứng dụng hữu ích, hãy ủng hộ mình một tách cà phê để có thêm động lực duy
              trì và phát triển thêm nhiều tính năng mới nhé!
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
              <div className="bg-white p-2 rounded-lg shrink-0">
                <img src="/vibe.jpg" alt="QR Code" className="h-32 w-auto object-contain" />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  Ngân hàng BIDV
                </div>
                <div className="text-2xl font-mono font-bold text-primary tracking-wider">
                  8833519981
                </div>
                <div className="text-sm font-medium opacity-80 mt-1">Nam vibe</div>
              </div>
            </div>
          </section>
        </CardContent>
        <div className="p-4 text-center border-t border-border/40 text-xs text-muted-foreground">
          © {new Date().getFullYear()} QuizHub Pro. Made with ❤️ for Education.
        </div>
      </Card>
    </div>
  );
}
