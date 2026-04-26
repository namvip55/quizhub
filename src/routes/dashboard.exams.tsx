import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExamFormDialog } from "@/components/dashboard/exams/ExamFormDialog";

type ExamsSearch = {
  edit?: string;
};

export const Route = createFileRoute("/dashboard/exams")({
  validateSearch: (search: Record<string, unknown>): ExamsSearch => {
    return {
      edit: search.edit as string | undefined,
    };
  },
  head: () => ({ meta: [{ title: "Đề thi — QuizHub" }] }),
  component: ExamsPage,
});

function ExamsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.id });
  const { edit: editExamId } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: exams, isLoading } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (editExamId && exams) {
      const examToEdit = exams.find(e => e.id === editExamId);
      if (examToEdit) {
        setEditingExam(examToEdit);
        setIsDialogOpen(true);
        // Clear the URL search param so it doesn't trigger again on reload
        navigate({ search: {} });
      }
    }
  }, [editExamId, exams, navigate]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xóa đề thi");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["exams-list"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("exams").update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.published ? "Đã xuất bản đề thi" : "Đã gỡ xuất bản");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredExams = exams?.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.exam_code.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = subjectFilter === "all" || e.subject_id === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Đề thi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tạo và quản lý các đề thi của bạn.</p>
        </div>
        <Button
          onClick={() => navigate({ to: "/dashboard/import" })}
        >
          <Plus className="mr-2 h-4 w-4" /> Import DOCX tạo đề
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm tiêu đề hoặc mã..."
            className="pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tất cả môn học" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả môn học</SelectItem>
            {subjects?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : filteredExams?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
          Chưa có đề thi nào. Nhấn "Đề thi mới" để tạo.
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-4 font-medium">Tiêu đề</th>
                <th className="p-4 font-medium">Môn học</th>
                <th className="p-4 font-medium text-center">Mã</th>
                <th className="p-4 font-medium text-center">Thời gian</th>
                <th className="p-4 font-medium text-center">Trạng thái</th>
                <th className="p-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredExams?.map((e) => (
                <tr key={e.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 font-medium">{e.title}</td>
                  <td className="p-4 text-muted-foreground">{e.subjects?.name || "Không rõ"}</td>
                  <td className="p-4 text-center">
                    <code className="bg-muted px-2 py-1 rounded">{e.exam_code}</code>
                  </td>
                  <td className="p-4 text-center">{e.duration} phút</td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${e.published ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-muted text-muted-foreground"}`}
                    >
                      {e.published ? "Đã xuất bản" : "Bản nháp"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          publishMutation.mutate({ id: e.id, published: !e.published })
                        }
                        title={e.published ? "Gỡ xuất bản" : "Xuất bản"}
                      >
                        {e.published ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingExam(e);
                          setIsDialogOpen(true);
                        }}
                        title="Sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        title="Xóa"
                        onClick={() => {
                          if (confirm("Đồng ý xóa đề thi này?")) deleteMutation.mutate(e.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isDialogOpen && (
        <ExamFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          exam={editingExam}
          subjects={subjects || []}
        />
      )}
    </div>
  );
}
