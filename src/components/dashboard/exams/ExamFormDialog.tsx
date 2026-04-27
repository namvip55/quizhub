import { useEffect } from "react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const examSchema = z.object({
  title: z.string().min(1, "Vui lòng nhập tiêu đề"),
  subject_id: z.string().min(1, "Vui lòng chọn môn học"),
  duration: z.coerce.number().min(1),
  allow_retry: z.boolean(),
  max_attempts: z.coerce.number().min(1),
  show_answer: z.boolean(),
  published: z.boolean(),
});

type FormValues = z.infer<typeof examSchema>;

type Exam = {
  id: string;
  title: string;
  subject_id: string;
  duration: number;
  allow_retry: boolean;
  max_attempts: number;
  show_answer: boolean;
  published: boolean;
};

type Subject = {
  id: string;
  name: string;
};

export function ExamFormDialog({
  open,
  onOpenChange,
  exam,
  subjects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: Exam;
  subjects: Subject[];
}) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      subject_id: "",
      duration: 60,
      allow_retry: true,
      max_attempts: 36,
      show_answer: true,
      published: false,
    },
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
        });
      } else {
        form.reset({
          title: "",
          subject_id: "",
          duration: 60,
          allow_retry: true,
          max_attempts: 36,
          show_answer: true,
          published: false,
        });
      }
    }
  }, [open, exam, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
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
      }
    },
    onSuccess: () => {
      toast.success("Đã cập nhật bài thi");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sửa thông tin đề thi</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-6 overflow-y-auto pr-2"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label>Môn học</Label>
              <Select
                onValueChange={(val) => form.setValue("subject_id", val)}
                value={form.watch("subject_id")}
                disabled={true}
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
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Cho phép làm lại</Label>
              </div>
              <Switch
                checked={form.watch("allow_retry")}
                onCheckedChange={(val) => form.setValue("allow_retry", val)}
              />
            </div>
            {form.watch("allow_retry") && (
              <div className="space-y-2">
                <Label>Số lần tối đa</Label>
                <Input type="number" {...form.register("max_attempts")} />
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Hiển thị đáp án</Label>
              </div>
              <Switch
                checked={form.watch("show_answer")}
                onCheckedChange={(val) => form.setValue("show_answer", val)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Xuất bản ngay</Label>
              </div>
              <Switch
                checked={form.watch("published")}
                onCheckedChange={(val) => form.setValue("published", val)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Cập nhật
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
