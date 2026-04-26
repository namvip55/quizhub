import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Copy, ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuestionFormDialog } from "@/components/dashboard/questions/QuestionFormDialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/questions")({
  head: () => ({ meta: [{ title: "Câu hỏi — QuizHub" }] }),
  component: QuestionsPage,
});

const PAGE_SIZE = 20;

function QuestionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [page, setPage] = useState(0);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: queryResult, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["questions", page, subjectFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select("*, subjects(name)", { count: "exact" });
      
      if (subjectFilter !== "all") {
        query = query.eq("subject_id", subjectFilter);
      }
      if (search) {
        query = query.ilike("content", `%${search}%`);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data, count };
    },
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xóa câu hỏi");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (question: any) => {
      const { id, created_at, updated_at, ...copy } = question;
      const { error } = await supabase.from("questions").insert(copy);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã nhân bản câu hỏi");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const questions = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ngân hàng câu hỏi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quản lý câu hỏi có thể tái sử dụng.</p>
        </div>
        <Button
          onClick={() => {
            setEditingQuestion(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tạo câu hỏi
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm nội dung..."
            className="pl-9 w-full"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Select 
          value={subjectFilter} 
          onValueChange={(v) => {
            setSubjectFilter(v);
            setPage(0);
          }}
        >
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

      {error ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-card">
          <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
          <p className="font-semibold mb-2">Lỗi mạng</p>
          <p className="text-sm text-muted-foreground mb-4">Không tải được câu hỏi. Vui lòng kiểm tra kết nối.</p>
          <Button onClick={() => refetch()} variant="outline">
            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Thử lại"}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
          <Search className="h-8 w-8 text-muted-foreground/50 mb-4" />
          <p className="font-medium text-foreground mb-1">Không tìm thấy câu hỏi</p>
          <p>Hãy điều chỉnh bộ lọc hoặc tìm kiếm khác.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q: any) => (
            <div key={q.id} className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-muted/30">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                      {q.subjects?.name || "Môn không xác định"}
                    </span>
                  </div>
                  <p className="text-sm font-medium line-clamp-3">{q.content}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                    {(q.options as string[]).map((opt, i) => (
                      <div key={i} className={`p-2 rounded-md border ${i === q.correct_answer ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400 font-medium' : 'bg-muted/30'}`}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 sm:flex-none justify-start"
                    onClick={() => {
                      setEditingQuestion(q);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 sm:flex-none justify-start text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => duplicateMutation.mutate(q)}
                    disabled={duplicateMutation.isPending}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Nhân bản
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 sm:flex-none justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Bạn có chắc muốn xóa câu hỏi này?")) {
                        deleteMutation.mutate(q.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Xóa
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Hiển thị {page * PAGE_SIZE + 1} đến {Math.min((page + 1) * PAGE_SIZE, totalCount)} trong {totalCount} câu hỏi
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Trước
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Tiếp <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isDialogOpen && (
        <QuestionFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          question={editingQuestion}
          subjects={subjects || []}
        />
      )}
    </div>
  );
}
