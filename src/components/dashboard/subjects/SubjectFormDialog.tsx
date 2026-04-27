import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subjectService, Subject } from "@/services/subject.service";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const subjectSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên môn học"),
  subject_code: z.string().max(8, "Mã tối đa 8 ký tự").optional(),
  description: z.string().optional(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

export function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", subject_code: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      if (subject) {
        form.reset({
          name: subject.name,
          subject_code: subject.subject_code || "",
          description: subject.description || "",
        });
      } else {
        form.reset({ name: "", subject_code: "", description: "" });
      }
    }
  }, [open, subject, form]);

  const mutation = useMutation({
    mutationFn: async (values: SubjectFormValues) => {
      const payload = { ...values };
      if (!payload.subject_code) {
        delete payload.subject_code;
      }

      if (subject) {
        return subjectService.updateSubject(subject.id, payload);
      } else {
        return subjectService.createSubject({
          ...payload,
          teacher_id: user!.id,
          name: payload.name, // explicitly pass required fields
        });
      }
    },
    onSuccess: () => {
      toast.success(subject ? "Đã cập nhật môn học" : "Đã tạo môn học");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject ? "Sửa môn học" : "Tạo môn học mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên môn học</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject_code">Mã học phần</Label>
              <Input
                id="subject_code"
                placeholder="Tự động tạo nếu để trống"
                {...form.register("subject_code")}
              />
              {form.formState.errors.subject_code && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.subject_code.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" {...form.register("description")} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
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
