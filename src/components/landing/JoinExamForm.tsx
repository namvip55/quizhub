import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { examService } from "@/services/exam.service";

export function JoinExamForm() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      toast.error("Mã bài thi không hợp lệ hoặc bài thi hiện không mở.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <Button type="submit" size="lg" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? "Đang kiểm tra..." : "Tham gia bài thi"}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">
        Không cần tài khoản — chỉ cần nhập mã giáo viên cung cấp.
      </p>
    </div>
  );
}
