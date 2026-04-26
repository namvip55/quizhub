import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import ReactMarkdown from "react-markdown";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const questionSchema = z.object({
  subject_id: z.string().min(1, "Vui lòng chọn môn học"),
  content: z.string().min(1, "Vui lòng nhập nội dung câu hỏi"),
  option_0: z.string().min(1, "Vui lòng nhập lựa chọn A"),
  option_1: z.string().min(1, "Vui lòng nhập lựa chọn B"),
  option_2: z.string().min(1, "Vui lòng nhập lựa chọn C"),
  option_3: z.string().min(1, "Vui lòng nhập lựa chọn D"),
  correct_answer: z.string().min(1),
  explanation: z.string().optional(),
});

type FormValues = z.infer<typeof questionSchema>;

export function QuestionFormDialog({
  open,
  onOpenChange,
  question,
  subjects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: any;
  subjects: any[];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewContent, setPreviewContent] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      subject_id: "",
      content: "",
      option_0: "",
      option_1: "",
      option_2: "",
      option_3: "",
      correct_answer: "0",
      explanation: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (question) {
        const options = question.options as string[];
        form.reset({
          subject_id: question.subject_id,
          content: question.content,
          option_0: options[0] || "",
          option_1: options[1] || "",
          option_2: options[2] || "",
          option_3: options[3] || "",
          correct_answer: question.correct_answer.toString(),
          explanation: question.explanation || "",
        });
        setPreviewContent(question.content);
      } else {
        form.reset({
          subject_id: subjects.length > 0 ? subjects[0].id : "",
          content: "",
          option_0: "",
          option_1: "",
          option_2: "",
          option_3: "",
          correct_answer: "0",
          explanation: "",
        });
        setPreviewContent("");
      }
    }
  }, [open, question, form, subjects]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        subject_id: values.subject_id,
        content: values.content,
        options: [values.option_0, values.option_1, values.option_2, values.option_3],
        correct_answer: parseInt(values.correct_answer),
        explanation: values.explanation || null,
      };

      if (question) {
        const { error } = await supabase.from("questions").update(payload).eq("id", question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("questions").insert({
          ...payload,
          created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(question ? "Đã cập nhật câu hỏi" : "Đã tạo câu hỏi");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Sửa câu hỏi" : "Tạo câu hỏi mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
          <div className="space-y-2">
            <Label>Môn học</Label>
            <Select
              onValueChange={(val) => form.setValue("subject_id", val)}
              value={form.watch("subject_id")}
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
            {form.formState.errors.subject_id && (
              <p className="text-xs text-destructive">{form.formState.errors.subject_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nội dung (Markdown)</Label>
              <Textarea
                className="h-32"
                {...form.register("content")}
                onChange={(e) => {
                  form.setValue("content", e.target.value);
                  setPreviewContent(e.target.value);
                }}
              />
              {form.formState.errors.content && (
                <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Xem trước</Label>
              <div className="h-32 overflow-auto rounded-md border p-4 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{previewContent}</ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Các lựa chọn & Đáp án đúng</Label>
            <RadioGroup
              onValueChange={(val) => form.setValue("correct_answer", val)}
              value={form.watch("correct_answer")}
            >
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <RadioGroupItem value={idx.toString()} id={`radio-${idx}`} />
                  <div className="flex-1">
                    <Input
                      placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}`}
                      {...form.register(`option_${idx}` as any)}
                    />
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Giải thích (Tùy chọn)</Label>
            <Textarea {...form.register("explanation")} placeholder="Hỗ trợ Markdown..." />
          </div>

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
