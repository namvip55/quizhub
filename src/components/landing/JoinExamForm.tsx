import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, BookOpen, Clock, Play, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { examService } from "@/services/exam.service";
import { supabase } from "@/integrations/supabase/client";

export function JoinExamForm() {
  const navigate = useNavigate();

  // ── Exam code tab ──
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Mã bài thi phải gồm 6 ký tự");
      return;
    }

    setLoading(true);
    try {
      const exam = await examService.getExamByCode(code);
      if (!exam) {
        toast.error("Mã bài thi không hợp lệ hoặc bài thi hiện không mở.");
        return;
      }
      navigate({ to: "/lobby/$examCode", params: { examCode: code.toUpperCase() } });
    } catch {
      toast.error("Mã bài thi không hợp lệ hoặc bài thi hiện không mở.");
    } finally {
      setLoading(false);
    }
  };

  // ── Subject code tab ──
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectResult, setSubjectResult] = useState<{
    name: string;
    exams: Array<{ id: string; title: string; exam_code: string; duration: number }>;
  } | null>(null);

  const handleSubjectSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = subjectCode.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập mã môn học.");
      return;
    }

    setSubjectLoading(true);
    setSubjectResult(null);
    try {
      const { data: subject, error: subjectError } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("subject_code", trimmed)
        .single();

      if (subjectError || !subject) {
        toast.error("Không tìm thấy môn học với mã này.");
        return;
      }

      const { data: exams, error: examsError } = await supabase
        .from("exams")
        .select("id, title, exam_code, duration")
        .eq("subject_id", subject.id)
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (examsError) throw examsError;

      setSubjectResult({ name: subject.name, exams: exams || [] });
    } catch {
      toast.error("Đã xảy ra lỗi khi tra cứu. Vui lòng thử lại.");
    } finally {
      setSubjectLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <Tabs defaultValue="exam" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger value="exam" className="text-sm">
            Mã đề thi
          </TabsTrigger>
          <TabsTrigger value="subject" className="text-sm">
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            Mã môn học
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Exam code ── */}
        <TabsContent value="exam" className="mt-4">
          <form onSubmit={handleExamSubmit} className="flex flex-col gap-3">
            <Input
              id="exam-code"
              placeholder="Nhập mã bài thi 6 ký tự"
              className="text-center text-2xl tracking-widest uppercase h-14 bg-card border-border/60"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <Button type="submit" size="lg" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? "Đang kiểm tra..." : "Tham gia bài thi"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Không cần tài khoản — chỉ cần nhập mã giáo viên cung cấp.
          </p>
        </TabsContent>

        {/* ── Tab 2: Subject code ── */}
        <TabsContent value="subject" className="mt-4">
          <form onSubmit={handleSubjectSearch} className="flex gap-2">
            <Input
              id="subject-code"
              placeholder="VD: CS101, MATH201..."
              className="flex-1 h-12 bg-card border-border/60 uppercase tracking-wider font-medium"
              value={subjectCode}
              onChange={(e) => {
                setSubjectCode(e.target.value.toUpperCase());
                if (subjectResult) setSubjectResult(null);
              }}
            />
            <Button type="submit" size="lg" className="h-12 px-5" disabled={subjectLoading || !subjectCode.trim()}>
              {subjectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>

          {/* Results */}
          {subjectResult && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold">{subjectResult.name}</h3>
                <span className="text-xs text-muted-foreground">
                  ({subjectResult.exams.length} đề thi)
                </span>
              </div>

              {subjectResult.exams.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 bg-card/60 p-6 text-center text-sm text-muted-foreground">
                  Chưa có đề thi nào được mở cho môn học này.
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {subjectResult.exams.map((exam) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:border-primary/40 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {exam.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="font-mono">{exam.exam_code}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {exam.duration} phút
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() =>
                          navigate({
                            to: "/lobby/$examCode",
                            params: { examCode: exam.exam_code },
                          })
                        }
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Vào thi
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground text-center">
            Nhập mã môn học để xem danh sách đề thi có sẵn.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
