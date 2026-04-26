import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { SubjectFormDialog } from "@/components/dashboard/subjects/SubjectFormDialog";
import { SubjectExamsDialog } from "@/components/dashboard/subjects/SubjectExamsDialog";

export const Route = createFileRoute("/dashboard/subjects")({
  head: () => ({ meta: [{ title: "Môn học — QuizHub" }] }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xóa môn học");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error) => {
      toast.error("Lỗi khi xóa môn học: " + error.message);
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Môn học</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quản lý các môn học của bạn.</p>
        </div>
        <Button
          onClick={() => {
            setEditingSubject(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tạo môn học
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm môn học..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : filteredSubjects?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/60 p-12 text-center text-sm text-muted-foreground">
          Chưa có môn học nào. Hãy tạo môn học đầu tiên để bắt đầu.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects?.map((subject) => (
            <div
              key={subject.id}
              className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col p-6 cursor-pointer hover:border-primary/40 transition-colors group"
              onClick={() => setSelectedSubject(subject)}
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
              <div className="mt-6 flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSubject(subject);
                    setIsDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Bạn có chắc chắn muốn xóa môn học này không?")) {
                      deleteMutation.mutate(subject.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SubjectFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        subject={editingSubject}
      />

      {selectedSubject && user && (
        <SubjectExamsDialog
          open={!!selectedSubject}
          onOpenChange={(open) => !open && setSelectedSubject(null)}
          subjectId={selectedSubject.id}
          subjectName={selectedSubject.name}
          userRole={user.role || "teacher"}
        />
      )}
    </div>
  );
}
