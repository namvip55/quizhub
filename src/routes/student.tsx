import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, LogOut, Home, GraduationCap } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SubjectExamsDialog } from "@/components/dashboard/subjects/SubjectExamsDialog";

export const Route = createFileRoute("/student")({
  head: () => ({ meta: [{ title: "Bảng điều khiển học sinh — QuizHub" }] }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<{ id: string; name: string } | null>(null);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Đăng xuất thành công");
    navigate({ to: "/login" });
  };

  const { data: trendingSubjects, isLoading: trendingLoading } = useQuery({
    queryKey: ["trending-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_top_subjects")
        .select("*")
        .order("attempts_count", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filteredSubjects = subjects?.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description?.toLowerCase().includes(q)) ||
      (s.subject_code?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-5xl">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)]">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight hidden sm:inline-block">QuizHub</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/" })}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4 sm:mr-2" /> <span className="hidden xs:inline">Trang chủ</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/about" })}
              className="text-muted-foreground hover:text-foreground"
            >
              <Info className="h-4 w-4 sm:mr-2" /> <span className="hidden xs:inline">Thông tin</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-destructive hover:bg-destructive/10 border-destructive/20"
            >
              <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden xs:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Môn học</h1>
            <p className="mt-1 text-sm text-muted-foreground">Chọn một môn học để xem các đề thi có sẵn.</p>
          </div>
        </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm môn học..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {(isLoading || trendingLoading) ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* TOP TRENDING SECTION */}
          {(!search && trendingSubjects && trendingSubjects.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <h2 className="text-xl font-semibold tracking-tight">Top Môn Học Nổi Bật</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trendingSubjects.map((subject) => (
                  <div
                    key={`trending-${subject.id}`}
                    onClick={() => setSelectedSubject(subject)}
                    className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col p-6 cursor-pointer hover:border-primary/40 transition-colors group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-bl-xl border-b border-l border-primary/10">
                      {subject.attempts_count} lượt thi
                    </div>
                    <div className="flex-1 mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">{subject.subject_code}</span>
                      </div>
                      <h3 className="font-semibold leading-none tracking-tight group-hover:text-primary transition-colors">{subject.name}</h3>
                      {subject.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {subject.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALL SUBJECTS SECTION */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              {search ? "Kết quả tìm kiếm" : "Tất cả môn học"}
            </h2>
            {filteredSubjects?.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
                Không tìm thấy môn học nào.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSubjects?.map((subject) => (
                  <div
                    key={subject.id}
                    onClick={() => setSelectedSubject(subject)}
                    className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col p-6 cursor-pointer hover:border-primary/40 transition-colors group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">{subject.subject_code}</span>
                      </div>
                      <h3 className="font-semibold leading-none tracking-tight group-hover:text-primary transition-colors">{subject.name}</h3>
                      {subject.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {subject.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedSubject && user && (
        <SubjectExamsDialog
          open={!!selectedSubject}
          onOpenChange={(open) => !open && setSelectedSubject(null)}
          subjectId={selectedSubject.id}
          subjectName={selectedSubject.name}
          userRole={profile?.role || "student"}
        />
      )}
    </div>
  </div>
);
}
