import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Trash2, Play, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ExamFormDialog } from "@/components/dashboard/exams/ExamFormDialog";

interface SubjectExamsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectName: string;
  userRole: string;
}

export function SubjectExamsDialog({
  open,
  onOpenChange,
  subjectId,
  subjectName,
  userRole,
}: SubjectExamsDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingExam, setEditingExam] = useState<any>(null);

  const { data: exams, isLoading } = useQuery({
    queryKey: ["subject-exams", subjectId, userRole],
    queryFn: async () => {
      let query = supabase
        .from("exams")
        .select("*")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });

      if (userRole === "student") {
        query = query.eq("published", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Xóa đề thi thành công");
      queryClient.invalidateQueries({ queryKey: ["subject-exams", subjectId] });
      queryClient.invalidateQueries({ queryKey: ["exams"] }); // in case teacher is on dashboard
    },
    onError: (error) => toast.error("Lỗi khi xóa đề thi: " + error.message),
  });

  return (
    <>
      <Dialog open={open && !editingExam} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <span>{subjectName}</span>
              </div>
            </DialogTitle>
            <DialogDescription>
              {userRole === "teacher"
                ? "Quản lý đề thi của môn học này."
                : "Danh sách đề thi có sẵn để luyện tập hoặc làm bài."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
              </div>
            ) : exams?.length === 0 ? (
              <div className="text-center p-8 text-sm text-muted-foreground border rounded-lg border-dashed">
                Chưa có đề thi nào cho môn học này.
              </div>
            ) : (
              <div className="grid gap-3">
                {exams?.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card shadow-sm hover:border-primary/20 transition-colors"
                  >
                    <div>
                      <h4 className="font-medium">{exam.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>
                          Mã: <span className="font-mono text-foreground">{exam.exam_code}</span>
                        </span>
                        <span>•</span>
                        <span>{exam.duration} phút</span>
                        {userRole === "teacher" && (
                          <>
                            <span>•</span>
                            <span
                              className={
                                exam.published
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }
                            >
                              {exam.published ? "Đã xuất bản" : "Bản nháp"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {userRole === "student" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate({
                                to: "/practice/$examCode",
                                params: { examCode: exam.exam_code },
                              })
                            }
                          >
                            <BookOpen className="mr-2 h-4 w-4" /> Luyện tập
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate({
                                to: "/lobby/$examCode",
                                params: { examCode: exam.exam_code },
                              })
                            }
                          >
                            <Play className="mr-2 h-4 w-4" /> Làm bài
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingExam(exam)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm("Bạn có chắc chắn muốn xóa đề thi này không?")) {
                                deleteMutation.mutate(exam.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Teacher Edit Dialog */}
      {editingExam && (
        <ExamFormDialog
          open={!!editingExam}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditingExam(null);
              // Invalidate queries to refresh the list after edit
              queryClient.invalidateQueries({ queryKey: ["subject-exams", subjectId] });
            }
          }}
          exam={editingExam}
          subjects={[{ id: subjectId, name: subjectName } as any]}
        />
      )}
    </>
  );
}
