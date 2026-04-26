import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const examSchema = z.object({
  title: z.string().min(1, "Vui lòng nhập tiêu đề"),
  subject_id: z.string().min(1, "Vui lòng chọn môn học"),
  duration: z.coerce.number().min(1),
  allow_retry: z.boolean(),
  max_attempts: z.coerce.number().min(1),
  show_answer: z.boolean(),
  published: z.boolean(),
  questionMode: z.enum(["manual", "random"]),
  randomCount: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof examSchema>;

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export function ExamFormDialog({
  open,
  onOpenChange,
  exam,
  subjects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: any;
  subjects: any[];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [hasAttempts, setHasAttempts] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      subject_id: "",
      duration: 60,
      allow_retry: false,
      max_attempts: 1,
      show_answer: true,
      published: false,
      questionMode: "manual",
      randomCount: 10,
    },
  });

  const subjectId = form.watch("subject_id");

  const { data: questions } = useQuery({
    queryKey: ["questions-for-exam-form", subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data, error } = await supabase
        .from("questions")
        .select("id, content")
        .eq("subject_id", subjectId);
      if (error) throw error;
      return data;
    },
    enabled: !!subjectId,
  });

  useEffect(() => {
    if (open) {
      if (exam) {
        form.reset({
          title: exam.title,
          subject_id: exam.subject_id,
          duration: exam.duration,
          allow_retry: exam.allow_retry,
          max_attempts: exam.max_attempts,
          show_answer: exam.show_answer,
          published: exam.published,
          questionMode: "manual",
        });
        // Check if has attempts
        supabase
          .from("exam_attempts")
          .select("id")
          .eq("exam_id", exam.id)
          .limit(1)
          .then(({ data }) => {
            setHasAttempts(!!data?.length);
          });
        // Load selected questions
        supabase
          .from("exam_questions")
          .select("question_id")
          .eq("exam_id", exam.id)
          .then(({ data }) => {
            setSelectedQuestions(data?.map((d) => d.question_id) || []);
          });
      } else {
        form.reset({
          title: "",
          subject_id: subjects.length > 0 ? subjects[0].id : "",
          duration: 60,
          allow_retry: false,
          max_attempts: 1,
          show_answer: true,
          published: false,
          questionMode: "manual",
          randomCount: 10,
        });
        setSelectedQuestions([]);
        setHasAttempts(false);
      }
    }
  }, [open, exam, form, subjects]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let finalQuestionIds = selectedQuestions;

      if (!exam && values.questionMode === "random") {
        if (!questions || questions.length === 0)
          throw new Error("Không có câu hỏi nào trong môn học này.");
        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        finalQuestionIds = shuffled.slice(0, values.randomCount).map((q) => q.id);
      }

      if (finalQuestionIds.length === 0) {
        throw new Error("Bạn phải chọn ít nhất một câu hỏi.");
      }

      const payload = {
        title: values.title,
        subject_id: values.subject_id,
        duration: values.duration,
        allow_retry: values.allow_retry,
        max_attempts: values.allow_retry ? values.max_attempts : 1,
        show_answer: values.show_answer,
        published: values.published,
      };

      if (exam) {
        const { error } = await supabase.from("exams").update(payload).eq("id", exam.id);
        if (error) throw error;

        if (!hasAttempts) {
          await supabase.from("exam_questions").delete().eq("exam_id", exam.id);
          const eqPayload = finalQuestionIds.map((qId, i) => ({
            exam_id: exam.id,
            question_id: qId,
            order_index: i,
          }));
          const { error: eqError } = await supabase.from("exam_questions").insert(eqPayload);
          if (eqError) throw eqError;
        }
      } else {
        const { data, error } = await supabase
          .from("exams")
          .insert({
            ...payload,
            exam_code: generateCode(),
            created_by: user!.id,
          })
          .select()
          .single();
        if (error) throw error;

        const eqPayload = finalQuestionIds.map((qId, i) => ({
          exam_id: data.id,
          question_id: qId,
          order_index: i,
        }));
        const { error: eqError } = await supabase.from("exam_questions").insert(eqPayload);
        if (eqError) throw eqError;
      }
    },
    onSuccess: () => {
      toast.success(exam ? "Đã cập nhật bài thi" : "Đã tạo bài thi");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{exam ? "Sửa bài thi" : "Tạo bài thi mới"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-6 overflow-y-auto pr-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label>Môn học</Label>
              <Select
                onValueChange={(val) => form.setValue("subject_id", val)}
                value={form.watch("subject_id")}
                disabled={!!exam}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Thời gian (phút)</Label>
              <Input type="number" {...form.register("duration")} />
            </div>
            <div className="space-y-2">
              <Label>Số lượt làm tối đa</Label>
              <Input
                type="number"
                {...form.register("max_attempts")}
                disabled={!form.watch("allow_retry")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.watch("allow_retry")}
                onCheckedChange={(val) => form.setValue("allow_retry", val)}
              />
              <Label>Cho phép làm lại</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.watch("show_answer")}
                onCheckedChange={(val) => form.setValue("show_answer", val)}
              />
              <Label>Hiển thị đáp án</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.watch("published")}
                onCheckedChange={(val) => form.setValue("published", val)}
              />
              <Label>Công khai ngay</Label>
            </div>
          </div>

          {!hasAttempts && !exam && (
            <div className="space-y-4">
              <Label>Lựa chọn câu hỏi</Label>
              <Tabs
                defaultValue="manual"
                onValueChange={(v) => form.setValue("questionMode", v as "manual" | "random")}
              >
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="manual">Chọn thủ công</TabsTrigger>
                  <TabsTrigger value="random">Tạo ngẫu nhiên</TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="mt-4">
                  <div className="border rounded-md max-h-60 overflow-y-auto p-4 space-y-2">
                    {questions?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">
                        Không có câu hỏi nào trong môn này.
                      </p>
                    ) : (
                      questions?.map((q) => (
                        <label
                          key={q.id}
                          className="flex items-start space-x-3 cursor-pointer p-2 hover:bg-muted/50 rounded"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedQuestions.includes(q.id)}
                            onChange={() => toggleQuestion(q.id)}
                          />
                          <span className="text-sm line-clamp-2">{q.content}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Đã chọn {selectedQuestions.length} câu
                  </p>
                </TabsContent>
                <TabsContent value="random" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Số lượng câu hỏi cần lấy</Label>
                    <Input
                      type="number"
                      {...form.register("randomCount")}
                      max={questions?.length || 0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Hiện có: {questions?.length || 0} câu hỏi.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {hasAttempts && (
            <div className="p-4 bg-yellow-500/10 text-yellow-600 rounded-md text-sm">
              Đề thi này đã có lượt làm bài. Không thể thay đổi danh sách câu hỏi.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
